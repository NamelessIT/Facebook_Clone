using FacebookClone.API.Common;
using FacebookClone.API.Hubs;
using FacebookClone.API.Services;
using FacebookClone.Domain.Enums;
using FacebookClone.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.API.Controllers;

[ApiController, Authorize, Route("api/v1/admin/lives")]
public class AdminLivesController(AppDbContext db, LiveAccessService access, IHubContext<LiveHub> hub) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var reviewerId = UserContext.GetUserId(User);
        if (!await access.HasPermissionAsync(reviewerId, "lives.view")) return Forbid();
        var sessions = await db.LiveSessions.AsNoTracking().Include(x => x.Owner).OrderByDescending(x => x.StartedAt).Take(200)
            .Select(x => new
            {
                x.Id, x.OwnerId, OwnerName = x.Owner.FirstName + " " + x.Owner.LastName, x.Owner.Email,
                x.Owner.IsLiveSuspended, x.Owner.LiveSuspensionReason, x.Title, x.Description,
                Privacy = (int)x.Privacy, x.IsShopping, Status = (int)x.Status, x.StartedAt, x.EndedAt,
                x.RecordingUrl, x.RecordingExpiresAt, x.ConvertedPostId, x.EndReason
            }).ToListAsync();
        return Ok(new { success = true, data = sessions });
    }

    [HttpPost("{id:guid}/terminate")]
    public async Task<IActionResult> Terminate(Guid id, [FromBody] ModerateLiveRequest request)
    {
        var reviewerId = UserContext.GetUserId(User);
        if (!await access.HasPermissionAsync(reviewerId, "lives.moderate")) return Forbid();
        if (string.IsNullOrWhiteSpace(request.Reason)) return BadRequest(new { success = false, message = "Cần nhập lý do kiểm duyệt." });
        var session = await db.LiveSessions.Include(x => x.Owner).FirstOrDefaultAsync(x => x.Id == id);
        if (session == null) return NotFound();
        if (session.Status != LiveSessionStatus.Live) return Conflict(new { success = false, message = "Chỉ có thể dừng một phiên đang live." });
        var now = DateTime.UtcNow;
        session.Status = LiveSessionStatus.Terminated;
        session.EndedAt = now;
        session.UpdatedAt = now;
        session.EndedByUserId = reviewerId;
        session.EndReason = request.Reason.Trim();
        session.RecordingUrl = null;
        session.RecordingExpiresAt = null;
        session.Owner.IsLiveSuspended = true;
        session.Owner.LiveSuspensionReason = request.Reason.Trim();
        session.Owner.LiveSuspendedAt = now;
        session.Owner.UpdatedAt = now;
        await db.SaveChangesAsync();
        await hub.Clients.Group(LiveHub.SessionGroup(id)).SendAsync("LiveTerminated", request.Reason.Trim());
        await hub.Clients.User(session.OwnerId.ToString()).SendAsync("LiveAccessSuspended", request.Reason.Trim());
        return Ok(new { success = true, message = "Đã dừng live và tạm khóa quyền live của chủ sở hữu." });
    }

    [HttpPost("users/{userId:guid}/restore")]
    public async Task<IActionResult> Restore(Guid userId)
    {
        var reviewerId = UserContext.GetUserId(User);
        if (!await access.HasPermissionAsync(reviewerId, "lives.restore")) return Forbid();
        var user = await db.Users.FirstOrDefaultAsync(x => x.Id == userId && !x.IsDeleted);
        if (user == null) return NotFound();
        user.IsLiveSuspended = false;
        user.LiveSuspensionReason = null;
        user.LiveSuspendedAt = null;
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await hub.Clients.User(userId.ToString()).SendAsync("LiveAccessRestored");
        return Ok(new { success = true, message = "Đã mở lại quyền live sau kiểm duyệt." });
    }
}

public sealed record ModerateLiveRequest(string Reason);
