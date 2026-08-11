using System.ComponentModel.DataAnnotations;
using FacebookClone.API.Common;
using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Policies;
using FacebookClone.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.API.Controllers;

[ApiController, Authorize, Route("api/v1/reports")]
public class ReportsController(AppDbContext db) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateModerationReportRequest request)
    {
        var reporterId = UserContext.GetUserId(User);
        var targetOwnerId = await GetTargetOwnerIdAsync(request.TargetType, request.TargetId);
        if (targetOwnerId == null) return NotFound(new { success = false, message = "Nội dung cần báo cáo không còn tồn tại." });
        if (targetOwnerId == reporterId) return BadRequest(new { success = false, message = "Bạn không thể báo cáo nội dung của chính mình." });

        var existing = await db.ModerationReports.FirstOrDefaultAsync(x => x.ReporterId == reporterId &&
            x.TargetType == request.TargetType && x.TargetId == request.TargetId);
        if (existing != null) return Ok(new { success = true, message = "Báo cáo này đã được ghi nhận trước đó.", data = new { existing.Id, Status = (int)existing.Status } });

        var now = DateTime.UtcNow;
        var report = new ModerationReport
        {
            Id = Guid.NewGuid(), ReporterId = reporterId, TargetType = request.TargetType, TargetId = request.TargetId,
            Reason = request.Reason.Trim(), Details = request.Details?.Trim(), Status = ModerationReportStatus.Pending,
            CreatedAt = now, UpdatedAt = now
        };
        db.ModerationReports.Add(report);

        // A report must preserve live evidence until a reviewer makes a decision.
        if (request.TargetType == ModerationTargetType.Live)
        {
            var live = await db.LiveSessions.FirstAsync(x => x.Id == request.TargetId);
            live.IsEvidenceOnHold = true;
            live.EvidenceExpiresAt ??= LiveSessionPolicy.EvidenceExpiresAt(live.EndedAt ?? now);
            live.UpdatedAt = now;
        }

        await db.SaveChangesAsync();
        return Ok(new { success = true, message = "Báo cáo đã được chuyển tới đội ngũ kiểm duyệt.", data = new { report.Id, Status = (int)report.Status } });
    }

    private async Task<Guid?> GetTargetOwnerIdAsync(ModerationTargetType type, Guid id) => type switch
    {
        ModerationTargetType.Post => await db.Posts.Where(x => x.Id == id && !x.IsDeleted).Select(x => (Guid?)x.UserId).FirstOrDefaultAsync(),
        ModerationTargetType.Reel => await db.Reels.Where(x => x.Id == id && !x.IsDeleted).Select(x => (Guid?)x.UserId).FirstOrDefaultAsync(),
        ModerationTargetType.Live => await db.LiveSessions.Where(x => x.Id == id).Select(x => (Guid?)x.OwnerId).FirstOrDefaultAsync(),
        ModerationTargetType.MarketplaceListing => await db.MarketplaceListings.Where(x => x.Id == id && !x.IsDeleted).Select(x => (Guid?)x.SellerId).FirstOrDefaultAsync(),
        ModerationTargetType.User => await db.Users.Where(x => x.Id == id && !x.IsDeleted).Select(x => (Guid?)x.Id).FirstOrDefaultAsync(),
        _ => null
    };
}

public sealed class CreateModerationReportRequest
{
    [EnumDataType(typeof(ModerationTargetType))] public ModerationTargetType TargetType { get; init; }
    public Guid TargetId { get; init; }
    [Required, StringLength(160, MinimumLength = 3)] public string Reason { get; init; } = string.Empty;
    [StringLength(2000)] public string? Details { get; init; }
}
