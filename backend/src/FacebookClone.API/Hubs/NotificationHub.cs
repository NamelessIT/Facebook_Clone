using FacebookClone.Application.Services.Interfaces;
using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using System.Security.Claims;

namespace FacebookClone.API.Hubs;

[Authorize]
public class NotificationHub : Hub
{
    private readonly INotificationService _notificationService;
    private readonly IUserRepository _userRepo;
    private readonly ILogger<NotificationHub> _logger;

    public NotificationHub(
        INotificationService notificationService,
        IUserRepository userRepo,
        ILogger<NotificationHub> logger)
    {
        _notificationService = notificationService;
        _userRepo = userRepo;
        _logger = logger;
    }

    private Guid GetCurrentUserId()
    {
        var id = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(id, out var guid) ? guid : Guid.Empty;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) { Context.Abort(); return; }

        // Tham gia group ca nhan de nhan notification
        await Groups.AddToGroupAsync(Context.ConnectionId, $"Notifications-{userId}");

        // Gui badge unread hien tai khi client vua ket noi
        var unreadCount = await _notificationService.GetUnreadCountAsync(userId);
        await Clients.Caller.SendAsync("BadgeUpdate", unreadCount);

        _logger.LogInformation("[NotificationHub] Connected | UserId={UserId} | ConnectionId={ConnId}", userId, Context.ConnectionId);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetCurrentUserId();
        if (userId != Guid.Empty)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Notifications-{userId}");
            _logger.LogInformation("[NotificationHub] Disconnected | UserId={UserId}", userId);
        }

        await base.OnDisconnectedAsync(exception);
    }

    // Danh dau 1 notification la da doc
    public async Task MarkNotificationAsRead(string notificationIdStr)
    {
        var userId = GetCurrentUserId();
        try
        {
            if (!Guid.TryParse(notificationIdStr, out var notificationId))
            {
                await Clients.Caller.SendAsync("Error", "ID thong bao khong hop le.");
                return;
            }

            await _notificationService.MarkAsReadAsync(userId, notificationId);
            await Clients.Caller.SendAsync("NotificationRead", notificationId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[NotificationHub] MarkAsRead failed | UserId={UserId}", userId);
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }

    // Xoa (soft delete) 1 notification
    public async Task DeleteNotification(string notificationIdStr)
    {
        var userId = GetCurrentUserId();
        try
        {
            if (!Guid.TryParse(notificationIdStr, out var notificationId))
            {
                await Clients.Caller.SendAsync("Error", "ID thong bao khong hop le.");
                return;
            }

            await _notificationService.DeleteNotificationAsync(userId, notificationId);
            await Clients.Caller.SendAsync("NotificationDeleted", notificationId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[NotificationHub] DeleteNotification failed | UserId={UserId}", userId);
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }
}
