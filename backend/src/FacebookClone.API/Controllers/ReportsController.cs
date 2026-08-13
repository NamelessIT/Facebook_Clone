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
public class ReportsController(AppDbContext db, IWebHostEnvironment environment) : ControllerBase
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
            Id = Guid.NewGuid(), ReporterId = reporterId, TargetType = request.TargetType, TargetId = request.TargetId, TargetOwnerId = targetOwnerId.Value,
            Reason = request.Reason.Trim(), Details = request.Details?.Trim(), Status = ModerationReportStatus.Pending,
            ReviewDueAt = ModerationPolicy.ReviewDueAt(now), CreatedAt = now, UpdatedAt = now
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

    [HttpPost("with-evidence")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(157_286_400)]
    public async Task<IActionResult> CreateWithEvidence([FromForm] CreateModerationReportWithEvidenceRequest request)
    {
        var reporterId = UserContext.GetUserId(User);
        var targetOwnerId = await GetTargetOwnerIdAsync(request.TargetType, request.TargetId);
        if (targetOwnerId == null) return NotFound(new { success = false, message = "Nội dung cần báo cáo không còn tồn tại." });
        if (targetOwnerId == reporterId) return BadRequest(new { success = false, message = "Bạn không thể báo cáo nội dung của chính mình." });

        var existing = await db.ModerationReports.FirstOrDefaultAsync(x => x.ReporterId == reporterId &&
            x.TargetType == request.TargetType && x.TargetId == request.TargetId);
        if (existing != null) return Ok(new { success = true, message = "Báo cáo này đã được ghi nhận trước đó.", data = new { existing.Id, Status = (int)existing.Status } });

        var files = request.Evidence ?? [];
        if (files.Count > 5) return BadRequest(new { success = false, message = "Mỗi báo cáo chỉ được đính kèm tối đa 5 tệp." });
        if (files.Sum(x => x.Length) > 150L * 1024 * 1024)
            return BadRequest(new { success = false, message = "Tổng dung lượng bằng chứng không được vượt quá 150 MB." });

        var now = DateTime.UtcNow;
        var report = new ModerationReport
        {
            Id = Guid.NewGuid(), ReporterId = reporterId, TargetType = request.TargetType, TargetId = request.TargetId, TargetOwnerId = targetOwnerId.Value,
            Reason = request.Reason.Trim(), Details = request.Details?.Trim(), Status = ModerationReportStatus.Pending,
            ReviewDueAt = ModerationPolicy.ReviewDueAt(now), CreatedAt = now, UpdatedAt = now
        };

        foreach (var file in files.Where(x => x.Length > 0))
        {
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".webm", ".mov", ".pdf", ".txt" };
            if (!allowed.Contains(extension))
                return BadRequest(new { success = false, message = $"Định dạng {extension} không được hỗ trợ làm bằng chứng." });
            if (file.Length > 100L * 1024 * 1024)
                return BadRequest(new { success = false, message = "Mỗi tệp bằng chứng không được vượt quá 100 MB." });

            var root = environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot");
            var folder = Path.Combine(root, "uploads", "report-evidence", now.ToString("yyyyMM"));
            Directory.CreateDirectory(folder);
            var storedName = $"{Guid.NewGuid():N}{extension}";
            await using var stream = System.IO.File.Create(Path.Combine(folder, storedName));
            await file.CopyToAsync(stream, HttpContext.RequestAborted);
            report.Evidence.Add(new ModerationReportEvidence
            {
                Id = Guid.NewGuid(), FileUrl = $"/uploads/report-evidence/{now:yyyyMM}/{storedName}",
                OriginalFileName = Path.GetFileName(file.FileName), ContentType = file.ContentType ?? "application/octet-stream",
                SizeBytes = file.Length, CreatedAt = now
            });
        }

        db.ModerationReports.Add(report);
        if (request.TargetType == ModerationTargetType.Live)
        {
            var live = await db.LiveSessions.FirstAsync(x => x.Id == request.TargetId);
            live.IsEvidenceOnHold = true;
            live.EvidenceExpiresAt ??= LiveSessionPolicy.EvidenceExpiresAt(live.EndedAt ?? now);
            live.UpdatedAt = now;
        }
        await db.SaveChangesAsync();
        return Ok(new { success = true, message = "Báo cáo và bằng chứng đã được chuyển tới đội ngũ kiểm duyệt.", data = new { report.Id, Status = (int)report.Status } });
    }

    private async Task<Guid?> GetTargetOwnerIdAsync(ModerationTargetType type, Guid id) => type switch
    {
        ModerationTargetType.Post => await db.Posts.Where(x => x.Id == id && !x.IsDeleted).Select(x => (Guid?)x.UserId).FirstOrDefaultAsync(),
        ModerationTargetType.Reel => await db.Reels.Where(x => x.Id == id && !x.IsDeleted).Select(x => (Guid?)x.UserId).FirstOrDefaultAsync(),
        ModerationTargetType.Live => await db.LiveSessions.Where(x => x.Id == id).Select(x => (Guid?)x.OwnerId).FirstOrDefaultAsync(),
        ModerationTargetType.MarketplaceListing => await db.MarketplaceListings.Where(x => x.Id == id && !x.IsDeleted).Select(x => (Guid?)x.SellerId).FirstOrDefaultAsync(),
        ModerationTargetType.User => await db.Users.Where(x => x.Id == id && !x.IsDeleted).Select(x => (Guid?)x.Id).FirstOrDefaultAsync(),
        ModerationTargetType.PostComment => await db.Comments.Where(x => x.Id == id && !x.IsDeleted).Select(x => (Guid?)x.UserId).FirstOrDefaultAsync(),
        ModerationTargetType.LiveComment => await db.LiveComments.Where(x => x.Id == id && !x.IsDeleted).Select(x => (Guid?)x.UserId).FirstOrDefaultAsync(),
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

public sealed class CreateModerationReportWithEvidenceRequest
{
    [EnumDataType(typeof(ModerationTargetType))] public ModerationTargetType TargetType { get; init; }
    public Guid TargetId { get; init; }
    [Required, StringLength(160, MinimumLength = 3)] public string Reason { get; init; } = string.Empty;
    [StringLength(2000)] public string? Details { get; init; }
    public List<IFormFile>? Evidence { get; init; }
}
