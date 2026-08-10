using FacebookClone.API.Common;
using FacebookClone.API.Hubs;
using FacebookClone.API.Services;
using FacebookClone.Application.Services.Interfaces;
using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Policies;
using FacebookClone.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.API.Controllers;

[ApiController, Authorize, Route("api/v1/lives")]
public class LivesController(AppDbContext db, LiveAccessService access, IFileService files, IHubContext<LiveHub> hub) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] bool includeEnded = true)
    {
        var userId = UserContext.GetUserId(User);
        var moderator = await access.IsModeratorAsync(userId);
        var now = DateTime.UtcNow;
        var candidates = await db.LiveSessions.AsNoTracking().Include(x => x.Owner)
            .Where(x => x.Status == LiveSessionStatus.Live ||
                (includeEnded && x.RecordingUrl != null && (x.RecordingExpiresAt == null || x.RecordingExpiresAt > now)))
            .OrderByDescending(x => x.StartedAt).Take(100).ToListAsync();
        var visible = new List<object>();
        foreach (var session in candidates)
            if (moderator || await access.CanViewAsync(session, userId, false)) visible.Add(ToResponse(session, userId, moderator));
        return Ok(new { success = true, data = visible });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var userId = UserContext.GetUserId(User);
        var session = await db.LiveSessions.AsNoTracking().Include(x => x.Owner).FirstOrDefaultAsync(x => x.Id == id);
        if (session == null) return NotFound(new { success = false, message = "Không tìm thấy phiên live." });
        var moderator = await access.IsModeratorAsync(userId);
        if (!moderator && !await access.CanViewAsync(session, userId, false)) return Forbid();
        if (session.Status != LiveSessionStatus.Live && session.RecordingExpiresAt <= DateTime.UtcNow)
            return StatusCode(StatusCodes.Status410Gone, new { success = false, message = "Bản phát lại đã hết hạn." });
        return Ok(new { success = true, data = ToResponse(session, userId, moderator) });
    }

    [HttpPost]
    public async Task<IActionResult> Start([FromBody] StartLiveRequest request)
    {
        var userId = UserContext.GetUserId(User);
        var user = await db.Users.FirstOrDefaultAsync(x => x.Id == userId && !x.IsDeleted);
        if (user == null) return Unauthorized();
        if (user.IsLiveSuspended) return StatusCode(StatusCodes.Status423Locked, new { success = false, message = "Chức năng live đang bị tạm khóa để kiểm duyệt.", reason = user.LiveSuspensionReason });
        if (await db.LiveSessions.AnyAsync(x => x.OwnerId == userId && x.Status == LiveSessionStatus.Live))
            return Conflict(new { success = false, message = "Bạn đang có một phiên live khác." });
        if (string.IsNullOrWhiteSpace(request.Title)) return BadRequest(new { success = false, message = "Tiêu đề live là bắt buộc." });

        var now = DateTime.UtcNow;
        var session = new LiveSession
        {
            Id = Guid.NewGuid(), OwnerId = userId, Owner = user, Title = request.Title.Trim(),
            Description = request.Description?.Trim(), Privacy = request.Privacy, IsShopping = request.IsShopping,
            Status = LiveSessionStatus.Live, StartedAt = now, UpdatedAt = now
        };
        db.LiveSessions.Add(session);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = session.Id }, new { success = true, data = ToResponse(session, userId, false) });
    }

    [HttpPut("{id:guid}/privacy")]
    public async Task<IActionResult> ChangePrivacy(Guid id, [FromBody] ChangeLivePrivacyRequest request)
    {
        var userId = UserContext.GetUserId(User);
        var session = await db.LiveSessions.Include(x => x.Owner).FirstOrDefaultAsync(x => x.Id == id);
        if (session == null) return NotFound();
        if (session.OwnerId != userId) return Forbid();
        if (session.Status != LiveSessionStatus.Live) return Conflict(new { success = false, message = "Chỉ đổi được quyền riêng tư khi đang live." });
        session.Privacy = request.Privacy;
        session.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        foreach (var viewer in LiveHub.GetViewers(id))
        {
            if (await access.CanViewAsync(session, viewer.UserId, false)) continue;
            await hub.Clients.Client(viewer.ConnectionId).SendAsync("LiveAccessRevoked");
            await hub.Groups.RemoveFromGroupAsync(viewer.ConnectionId, LiveHub.SessionGroup(id));
            LiveHub.RemoveParticipant(viewer.ConnectionId);
        }
        await hub.Clients.Group(LiveHub.SessionGroup(id)).SendAsync("LivePrivacyChanged", (int)request.Privacy);
        await hub.Clients.Group(LiveHub.SessionGroup(id)).SendAsync("ViewerCountChanged", LiveHub.GetViewerCount(id));
        return Ok(new { success = true, data = ToResponse(session, userId, false) });
    }

    [HttpPut("{id:guid}/stop")]
    public async Task<IActionResult> Stop(Guid id)
    {
        var userId = UserContext.GetUserId(User);
        var session = await db.LiveSessions.Include(x => x.Owner).FirstOrDefaultAsync(x => x.Id == id);
        if (session == null) return NotFound();
        if (session.OwnerId != userId) return Forbid();
        if (session.Status != LiveSessionStatus.Live) return Ok(new { success = true, data = ToResponse(session, userId, false) });
        var now = DateTime.UtcNow;
        session.Status = LiveSessionStatus.Ended;
        session.EndedAt = now;
        session.UpdatedAt = now;
        session.RecordingExpiresAt = LiveSessionPolicy.ReplayExpiresAt(now);
        await db.SaveChangesAsync();
        await hub.Clients.Group(LiveHub.SessionGroup(id)).SendAsync("LiveEnded", session.RecordingExpiresAt);
        return Ok(new { success = true, data = ToResponse(session, userId, false) });
    }

    [HttpPost("{id:guid}/recording"), RequestSizeLimit(524_288_000)]
    public async Task<IActionResult> UploadRecording(Guid id, IFormFile recording)
    {
        var userId = UserContext.GetUserId(User);
        var session = await db.LiveSessions.Include(x => x.Owner).FirstOrDefaultAsync(x => x.Id == id);
        if (session == null) return NotFound();
        if (session.OwnerId != userId) return Forbid();
        if (session.Status == LiveSessionStatus.Live) return Conflict(new { success = false, message = "Hãy kết thúc live trước khi lưu bản ghi." });
        if (session.Status == LiveSessionStatus.Terminated) return StatusCode(StatusCodes.Status423Locked, new { success = false, message = "Live bị kiểm duyệt không được lưu bản phát lại." });
        if (!string.IsNullOrWhiteSpace(session.RecordingUrl)) return Conflict(new { success = false, message = "Bản ghi live đã được tải lên." });
        session.RecordingUrl = await files.UploadVideoAsync(recording, "live-recordings");
        session.RecordingExpiresAt = LiveSessionPolicy.ReplayExpiresAt(DateTime.UtcNow);
        session.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { success = true, data = ToResponse(session, userId, false) });
    }

    [HttpPost("{id:guid}/convert-to-post")]
    public async Task<IActionResult> ConvertToPost(Guid id, [FromBody] ConvertLiveToPostRequest request)
    {
        var userId = UserContext.GetUserId(User);
        var session = await db.LiveSessions.Include(x => x.Owner).FirstOrDefaultAsync(x => x.Id == id);
        if (session == null) return NotFound();
        if (session.OwnerId != userId) return Forbid();
        if (session.ConvertedPostId != null) return Conflict(new { success = false, message = "Live đã được chuyển thành bài viết." });
        if (session.Status != LiveSessionStatus.Ended || string.IsNullOrWhiteSpace(session.RecordingUrl) || session.RecordingExpiresAt <= DateTime.UtcNow)
            return Conflict(new { success = false, message = "Không còn bản ghi hợp lệ để chuyển thành bài viết." });
        var now = DateTime.UtcNow;
        var post = new Post
        {
            Id = Guid.NewGuid(), UserId = userId,
            Content = string.IsNullOrWhiteSpace(request.Content) ? session.Title : request.Content.Trim(),
            Privacy = request.Privacy ?? session.Privacy, PostType = PostType.Normal, CreatedAt = now, UpdatedAt = now,
            Medias = [new MediaAttachment { Id = Guid.NewGuid(), Url = session.RecordingUrl, MediaType = MediaType.Video, CreatedAt = now }]
        };
        db.Posts.Add(post);
        session.ConvertedPostId = post.Id;
        session.RecordingExpiresAt = null;
        session.UpdatedAt = now;
        await db.SaveChangesAsync();
        return Ok(new { success = true, data = new { postId = post.Id, live = ToResponse(session, userId, false) } });
    }

    private static object ToResponse(LiveSession x, Guid currentUserId, bool moderator) => new
    {
        x.Id, x.OwnerId, OwnerName = x.Owner.FullName, x.Owner.AvatarUrl, x.Title, x.Description,
        Privacy = (int)x.Privacy, x.IsShopping, Status = (int)x.Status, x.StartedAt, x.EndedAt,
        x.RecordingUrl, x.RecordingExpiresAt, x.ConvertedPostId, x.EndReason,
        ViewerCount = LiveHub.GetViewerCount(x.Id), IsOwner = x.OwnerId == currentUserId, CanModerate = moderator
    };
}

public sealed record StartLiveRequest(string Title, string? Description, PostPrivacy Privacy = PostPrivacy.Public, bool IsShopping = false);
public sealed record ChangeLivePrivacyRequest(PostPrivacy Privacy);
public sealed record ConvertLiveToPostRequest(string? Content, PostPrivacy? Privacy);
