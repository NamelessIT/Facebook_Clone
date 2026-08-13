using FacebookClone.API.Common;
using FacebookClone.API.Hubs;
using FacebookClone.API.Services;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Policies;
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
                x.RecordingUrl, x.RecordingExpiresAt, x.EvidenceExpiresAt, x.IsEvidenceOnHold,
                x.ConvertedPostId, x.EndReason
            }).ToListAsync();
        return Ok(new { success = true, data = sessions });
    }

    [HttpPost("{id:guid}/terminate")]
    public async Task<IActionResult> Terminate(Guid id, [FromBody] ModerateLiveRequest request)
    {
        var reviewerId = UserContext.GetUserId(User);
        if (!await access.HasPermissionAsync(reviewerId, "lives.moderate")) return Forbid();
        if (string.IsNullOrWhiteSpace(request.Reason)) return BadRequest(new { success = false, message = "Cần nhập lý do kiểm duyệt." });
        await using var transaction = await db.Database.BeginTransactionAsync();
        var session = await db.LiveSessions
            .FromSqlInterpolated($"SELECT * FROM \"LiveSessions\" WHERE \"Id\" = {id} FOR UPDATE")
            .FirstOrDefaultAsync();
        if (session == null) return NotFound();
        session.Owner = await db.Users.FirstAsync(x => x.Id == session.OwnerId);
        if (session.Status == LiveSessionStatus.Terminated)
            return Conflict(new { success = false, message = "Phiên live này đã bị kiểm duyệt." });
        var wasLive = session.Status == LiveSessionStatus.Live;
        var now = DateTime.UtcNow;
        session.Status = LiveSessionStatus.Terminated;
        session.EndedAt = now;
        session.UpdatedAt = now;
        session.EndedByUserId = reviewerId;
        session.EndReason = request.Reason.Trim();
        session.RecordingExpiresAt = null;
        session.EvidenceExpiresAt ??= LiveSessionPolicy.EvidenceExpiresAt(session.EndedAt ?? now);
        session.IsEvidenceOnHold = true;
        session.Owner.IsLiveSuspended = true;
        session.Owner.LiveSuspensionReason = request.Reason.Trim();
        session.Owner.LiveSuspendedAt = now;
        session.Owner.UpdatedAt = now;
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        if (wasLive)
            await hub.Clients.Group(LiveHub.SessionGroup(id)).SendAsync("LiveTerminated", request.Reason.Trim());
        await hub.Clients.User(session.OwnerId.ToString()).SendAsync("LiveAccessSuspended", request.Reason.Trim());
        return Ok(new { success = true, message = wasLive
            ? "Đã dừng live, giữ bằng chứng và tạm khóa quyền live của chủ sở hữu."
            : "Đã giữ bằng chứng và khóa quyền live của chủ sở hữu sau kiểm duyệt." });
    }

    [HttpPut("{id:guid}/evidence-hold")]
    public async Task<IActionResult> SetEvidenceHold(Guid id, [FromBody] EvidenceHoldRequest request)
    {
        var reviewerId = UserContext.GetUserId(User);
        if (!await access.HasPermissionAsync(reviewerId, "lives.moderate")) return Forbid();
        var session = await db.LiveSessions.FirstOrDefaultAsync(x => x.Id == id);
        if (session == null) return NotFound();
        session.IsEvidenceOnHold = request.Hold;
        if (request.Hold)
            session.EvidenceExpiresAt ??= LiveSessionPolicy.EvidenceExpiresAt(session.EndedAt ?? DateTime.UtcNow);
        else if (session.EvidenceExpiresAt is null || session.EvidenceExpiresAt <= DateTime.UtcNow)
            session.EvidenceExpiresAt = DateTime.UtcNow.AddDays(1);
        session.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { success = true, data = new { session.Id, session.IsEvidenceOnHold, session.EvidenceExpiresAt } });
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
        var restoredAt = DateTime.UtcNow;
        var livePenalties = await db.ModerationReports
            .Where(x => x.TargetOwnerId == userId &&
                        x.ResolutionAction == ModerationAction.LiveSuspended &&
                        x.Status == ModerationReportStatus.Resolved &&
                        x.RestoredAt == null)
            .ToListAsync();
        foreach (var penalty in livePenalties)
        {
            penalty.RestoredAt = restoredAt;
            penalty.RestoredById = reviewerId;
            penalty.UpdatedAt = restoredAt;
        }
        var heldSessions = await db.LiveSessions
            .Where(x => x.OwnerId == userId && x.IsEvidenceOnHold)
            .ToListAsync();
        foreach (var session in heldSessions)
        {
            session.IsEvidenceOnHold = false;
            if (session.EvidenceExpiresAt is null || session.EvidenceExpiresAt <= DateTime.UtcNow)
                session.EvidenceExpiresAt = DateTime.UtcNow.AddDays(1);
        }
        await db.SaveChangesAsync();
        await hub.Clients.User(userId.ToString()).SendAsync("LiveAccessRestored");
        return Ok(new { success = true, message = "Đã mở lại quyền live sau kiểm duyệt." });
    }
}

public sealed record ModerateLiveRequest(string Reason);
public sealed record EvidenceHoldRequest(bool Hold);
