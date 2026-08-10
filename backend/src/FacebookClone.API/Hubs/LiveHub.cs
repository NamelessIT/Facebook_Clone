using System.Collections.Concurrent;
using System.Security.Claims;
using FacebookClone.API.Services;
using FacebookClone.Domain.Enums;
using FacebookClone.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.API.Hubs;

[Authorize]
public class LiveHub(AppDbContext db, LiveAccessService access, ILogger<LiveHub> logger) : Hub
{
    private sealed record Participant(Guid SessionId, Guid UserId, bool IsBroadcaster);
    private static readonly ConcurrentDictionary<string, Participant> Participants = new();

    public static int GetViewerCount(Guid sessionId) => Participants.Values.Count(x => x.SessionId == sessionId && !x.IsBroadcaster);
    public static IReadOnlyList<(string ConnectionId, Guid UserId)> GetViewers(Guid sessionId) => Participants
        .Where(x => x.Value.SessionId == sessionId && !x.Value.IsBroadcaster)
        .Select(x => (x.Key, x.Value.UserId))
        .ToList();
    public static bool RemoveParticipant(string connectionId) => Participants.TryRemove(connectionId, out _);
    public static string SessionGroup(Guid sessionId) => $"Live-{sessionId}";
    public static string BroadcasterGroup(Guid sessionId) => $"LiveBroadcaster-{sessionId}";

    private Guid CurrentUserId() => Guid.TryParse(Context.User?.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    public async Task JoinSession(string sessionId, bool asBroadcaster = false)
    {
        if (!Guid.TryParse(sessionId, out var id)) throw new HubException("Phiên live không hợp lệ.");
        var userId = CurrentUserId();
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId && !x.IsDeleted);
        if (user == null || user.IsBanned) throw new HubException("Tài khoản không thể tham gia live.");
        if (user.IsLiveSuspended) throw new HubException("Chức năng live đang bị tạm khóa để kiểm duyệt.");
        var session = await db.LiveSessions.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (session == null || session.Status != LiveSessionStatus.Live) throw new HubException("Phiên live đã kết thúc.");
        if (asBroadcaster && session.OwnerId != userId) throw new HubException("Chỉ chủ sở hữu được phát live.");
        if (!await access.CanViewAsync(session, userId)) throw new HubException("Bạn không có quyền xem phiên live này.");

        Participants[Context.ConnectionId] = new Participant(id, userId, asBroadcaster);
        await Groups.AddToGroupAsync(Context.ConnectionId, SessionGroup(id));
        if (asBroadcaster) await Groups.AddToGroupAsync(Context.ConnectionId, BroadcasterGroup(id));
        else
        {
            await Clients.Group(BroadcasterGroup(id)).SendAsync("ViewerJoined", Context.ConnectionId, userId, user.FullName);
            await Clients.Group(SessionGroup(id)).SendAsync("ViewerCountChanged", GetViewerCount(id));
        }
    }

    public Task SendOffer(string targetConnectionId, object offer) => Relay(targetConnectionId, "ReceiveOffer", offer);
    public Task SendAnswer(string targetConnectionId, object answer) => Relay(targetConnectionId, "ReceiveAnswer", answer);
    public Task SendIceCandidate(string targetConnectionId, object candidate) => Relay(targetConnectionId, "ReceiveIceCandidate", candidate);

    private async Task Relay(string targetConnectionId, string eventName, object payload)
    {
        if (!Participants.TryGetValue(Context.ConnectionId, out var sender) ||
            !Participants.TryGetValue(targetConnectionId, out var target) || sender.SessionId != target.SessionId)
            throw new HubException("Kết nối live không hợp lệ.");
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == sender.UserId);
        var active = await db.LiveSessions.AsNoTracking().AnyAsync(x => x.Id == sender.SessionId && x.Status == LiveSessionStatus.Live);
        if (user?.IsLiveSuspended != false || !active) throw new HubException("Phiên live đã bị dừng.");
        await Clients.Client(targetConnectionId).SendAsync(eventName, Context.ConnectionId, payload);
    }

    public async Task LeaveSession()
    {
        if (!Participants.TryRemove(Context.ConnectionId, out var participant)) return;
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, SessionGroup(participant.SessionId));
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, BroadcasterGroup(participant.SessionId));
        await Clients.Group(SessionGroup(participant.SessionId)).SendAsync("ViewerCountChanged", GetViewerCount(participant.SessionId));
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        try { await LeaveSession(); }
        catch (Exception ex) { logger.LogWarning(ex, "Could not clean up live participant {ConnectionId}", Context.ConnectionId); }
        await base.OnDisconnectedAsync(exception);
    }
}
