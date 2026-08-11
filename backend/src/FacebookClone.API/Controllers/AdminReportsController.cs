using System.ComponentModel.DataAnnotations;
using FacebookClone.API.Common;
using FacebookClone.API.Hubs;
using FacebookClone.API.Services;
using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Policies;
using FacebookClone.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.API.Controllers;

[ApiController, Authorize, Route("api/v1/admin/reports")]
public class AdminReportsController(AppDbContext db, LiveAccessService access, IHubContext<LiveHub> liveHub) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] ModerationReportStatus? status = null, [FromQuery] ModerationTargetType? targetType = null)
    {
        if (!await HasPermission("reports.view")) return Forbid();
        var query = db.ModerationReports.AsNoTracking().Include(x => x.Reporter).AsQueryable();
        if (status.HasValue) query = query.Where(x => x.Status == status.Value);
        if (targetType.HasValue) query = query.Where(x => x.TargetType == targetType.Value);
        var reports = await query.OrderByDescending(x => x.CreatedAt).Take(250).ToListAsync();
        var result = new List<object>(reports.Count);
        foreach (var report in reports)
        {
            var target = await DescribeTargetAsync(report.TargetType, report.TargetId);
            result.Add(new
            {
                report.Id, TargetType = (int)report.TargetType, report.TargetId, report.Reason, report.Details,
                Status = (int)report.Status, ResolutionAction = (int)report.ResolutionAction, report.ResolutionNote,
                Reporter = new { report.ReporterId, report.Reporter.FullName, report.Reporter.Email },
                report.CreatedAt, report.UpdatedAt, report.ReviewedAt, report.ReviewedById,
                target.Title, target.OwnerId, target.OwnerName, target.Exists, target.AdminPath, target.PublicPath
            });
        }
        return Ok(new { success = true, data = result });
    }

    [HttpPut("{id:guid}/review")]
    public async Task<IActionResult> Review(Guid id)
    {
        if (!await HasPermission("reports.manage")) return Forbid();
        var report = await db.ModerationReports.FindAsync(id);
        if (report == null) return NotFound();
        if (report.Status == ModerationReportStatus.Resolved || report.Status == ModerationReportStatus.Dismissed)
            return Conflict(new { success = false, message = "Báo cáo đã được xử lý." });
        report.Status = ModerationReportStatus.Reviewing; report.ReviewedById = UserContext.GetUserId(User); report.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { success = true, message = "Đã nhận báo cáo để kiểm duyệt." });
    }

    [HttpPost("{id:guid}/resolve")]
    public async Task<IActionResult> Resolve(Guid id, [FromBody] ResolveModerationReportRequest request)
    {
        if (!await HasPermission("reports.manage")) return Forbid();
        var report = await db.ModerationReports.FirstOrDefaultAsync(x => x.Id == id);
        if (report == null) return NotFound();
        if (report.Status is ModerationReportStatus.Resolved or ModerationReportStatus.Dismissed)
            return Conflict(new { success = false, message = "Báo cáo đã được xử lý." });
        if (request.Dismiss)
        {
            report.Status = ModerationReportStatus.Dismissed;
            report.ResolutionAction = ModerationAction.None;
        }
        else
        {
            if (!IsActionCompatible(report.TargetType, request.Action))
                return BadRequest(new { success = false, message = "Hình thức xử lý không phù hợp với loại đối tượng bị báo cáo." });
            try { await ApplyActionAsync(report, request.Action, request.Note); }
            catch (InvalidOperationException ex) { return BadRequest(new { success = false, message = ex.Message }); }
            report.Status = ModerationReportStatus.Resolved;
            report.ResolutionAction = request.Action;
        }
        report.ResolutionNote = request.Note?.Trim(); report.ReviewedById = UserContext.GetUserId(User);
        report.ReviewedAt = DateTime.UtcNow; report.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { success = true, message = request.Dismiss ? "Đã bác bỏ báo cáo." : "Đã áp dụng hình thức xử lý và đóng báo cáo." });
    }

    private async Task ApplyActionAsync(ModerationReport report, ModerationAction action, string? note)
    {
        var reason = string.IsNullOrWhiteSpace(note) ? $"Xử lý báo cáo {report.Id}" : note.Trim();
        var ownerId = await GetTargetOwnerIdAsync(report.TargetType, report.TargetId)
            ?? throw new InvalidOperationException("Đối tượng báo cáo không còn tồn tại.");
        var owner = await db.Users.FirstAsync(x => x.Id == ownerId);
        if (owner.IsAdmin && action != ModerationAction.ContentRemoved)
            throw new InvalidOperationException("Không thể khóa quyền quản trị viên từ báo cáo nội dung.");

        if (action == ModerationAction.ContentRemoved)
        {
            if (report.TargetType == ModerationTargetType.Post)
            {
                var post = await db.Posts.IgnoreQueryFilters().FirstAsync(x => x.Id == report.TargetId);
                post.IsDeleted = true; post.UpdatedAt = DateTime.UtcNow;
            }
            else if (report.TargetType == ModerationTargetType.Reel)
            {
                var reel = await db.Reels.IgnoreQueryFilters().FirstAsync(x => x.Id == report.TargetId);
                reel.IsDeleted = true; reel.UpdatedAt = DateTime.UtcNow;
            }
            else if (report.TargetType == ModerationTargetType.MarketplaceListing)
            {
                var listing = await db.MarketplaceListings.FirstAsync(x => x.Id == report.TargetId);
                listing.Status = MarketplaceListingStatus.Removed; listing.ModerationNote = reason; listing.UpdatedAt = DateTime.UtcNow;
            }
            else if (report.TargetType == ModerationTargetType.Live)
                await TerminateLiveAsync(report.TargetId, owner, reason, false);
            else throw new InvalidOperationException("Không thể gỡ trực tiếp một tài khoản; hãy chọn khóa tài khoản.");
            return;
        }

        switch (action)
        {
            case ModerationAction.PostSuspended:
                owner.IsPostSuspended = true; owner.PostSuspensionReason = reason; owner.PostSuspendedAt = DateTime.UtcNow; break;
            case ModerationAction.ReelSuspended:
                owner.IsReelSuspended = true; owner.ReelSuspensionReason = reason; owner.ReelSuspendedAt = DateTime.UtcNow; break;
            case ModerationAction.LiveSuspended:
                await TerminateLiveAsync(report.TargetType == ModerationTargetType.Live ? report.TargetId : null, owner, reason, true); break;
            case ModerationAction.MarketplaceSuspended:
                owner.IsMarketplaceSuspended = true; owner.MarketplaceSuspensionReason = reason; owner.MarketplaceSuspendedAt = DateTime.UtcNow;
                var listings = await db.MarketplaceListings.Where(x => x.SellerId == owner.Id && x.Status == MarketplaceListingStatus.Approved).ToListAsync();
                foreach (var listing in listings) { listing.Status = MarketplaceListingStatus.Removed; listing.ModerationNote = reason; listing.UpdatedAt = DateTime.UtcNow; }
                break;
            case ModerationAction.AccountBanned:
                owner.IsBanned = true; owner.BanReason = reason; owner.BannedAt = DateTime.UtcNow; break;
            default: throw new InvalidOperationException("Hình thức xử lý không hợp lệ.");
        }
        owner.UpdatedAt = DateTime.UtcNow;
    }

    private async Task TerminateLiveAsync(Guid? liveId, User owner, string reason, bool suspend)
    {
        if (liveId.HasValue)
        {
            var live = await db.LiveSessions.FirstOrDefaultAsync(x => x.Id == liveId.Value);
            if (live != null)
            {
                var wasLive = live.Status == LiveSessionStatus.Live;
                live.Status = LiveSessionStatus.Terminated; live.EndedAt ??= DateTime.UtcNow; live.EndReason = reason;
                live.EndedByUserId = UserContext.GetUserId(User); live.IsEvidenceOnHold = true; live.RecordingExpiresAt = null;
                live.EvidenceExpiresAt ??= LiveSessionPolicy.EvidenceExpiresAt(live.EndedAt.Value); live.UpdatedAt = DateTime.UtcNow;
                if (wasLive) await liveHub.Clients.Group(LiveHub.SessionGroup(live.Id)).SendAsync("LiveTerminated", reason);
            }
        }
        if (suspend)
        {
            owner.IsLiveSuspended = true; owner.LiveSuspensionReason = reason; owner.LiveSuspendedAt = DateTime.UtcNow; owner.UpdatedAt = DateTime.UtcNow;
            await liveHub.Clients.User(owner.Id.ToString()).SendAsync("LiveAccessSuspended", reason);
        }
    }

    private async Task<Guid?> GetTargetOwnerIdAsync(ModerationTargetType type, Guid id) => type switch
    {
        ModerationTargetType.Post => await db.Posts.IgnoreQueryFilters().Where(x => x.Id == id).Select(x => (Guid?)x.UserId).FirstOrDefaultAsync(),
        ModerationTargetType.Reel => await db.Reels.IgnoreQueryFilters().Where(x => x.Id == id).Select(x => (Guid?)x.UserId).FirstOrDefaultAsync(),
        ModerationTargetType.Live => await db.LiveSessions.Where(x => x.Id == id).Select(x => (Guid?)x.OwnerId).FirstOrDefaultAsync(),
        ModerationTargetType.MarketplaceListing => await db.MarketplaceListings.Where(x => x.Id == id).Select(x => (Guid?)x.SellerId).FirstOrDefaultAsync(),
        ModerationTargetType.User => await db.Users.IgnoreQueryFilters().Where(x => x.Id == id).Select(x => (Guid?)x.Id).FirstOrDefaultAsync(),
        _ => null
    };

    private async Task<TargetDescription> DescribeTargetAsync(ModerationTargetType type, Guid id)
    {
        if (type == ModerationTargetType.Post)
        {
            var x = await db.Posts.IgnoreQueryFilters().Include(p => p.User).FirstOrDefaultAsync(p => p.Id == id);
            return x == null ? TargetDescription.Missing(type, id) : new(x.Content.Length > 80 ? x.Content[..80] + "…" : x.Content, x.UserId, x.User.FullName, true, $"/admin/posts?targetId={id}", $"/posts/{id}");
        }
        if (type == ModerationTargetType.Reel)
        {
            var x = await db.Reels.IgnoreQueryFilters().Include(r => r.User).FirstOrDefaultAsync(r => r.Id == id);
            return x == null ? TargetDescription.Missing(type, id) : new(x.Title ?? x.Caption ?? "Reel", x.UserId, x.User.FullName, true, $"/admin/reels?targetId={id}", $"/reels?targetId={id}");
        }
        if (type == ModerationTargetType.Live)
        {
            var x = await db.LiveSessions.Include(l => l.Owner).FirstOrDefaultAsync(l => l.Id == id);
            return x == null ? TargetDescription.Missing(type, id) : new(x.Title, x.OwnerId, x.Owner.FullName, true, $"/admin/lives?targetId={id}", $"/live?session={id}");
        }
        if (type == ModerationTargetType.MarketplaceListing)
        {
            var x = await db.MarketplaceListings.Include(l => l.Seller).FirstOrDefaultAsync(l => l.Id == id);
            return x == null ? TargetDescription.Missing(type, id) : new(x.Title, x.SellerId, x.Seller.FullName, true, $"/admin/marketplace?targetId={id}", $"/marketplace?item={id}");
        }
        var user = await db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id);
        return user == null ? TargetDescription.Missing(type, id) : new(user.FullName, user.Id, user.FullName, true, $"/admin/users?targetId={id}", $"/profile/{id}");
    }

    private Task<bool> HasPermission(string key) => access.HasPermissionAsync(UserContext.GetUserId(User), key);
    private static bool IsActionCompatible(ModerationTargetType targetType, ModerationAction action) => targetType switch
    {
        ModerationTargetType.Post => action is ModerationAction.ContentRemoved or ModerationAction.PostSuspended or ModerationAction.AccountBanned,
        ModerationTargetType.Reel => action is ModerationAction.ContentRemoved or ModerationAction.ReelSuspended or ModerationAction.AccountBanned,
        ModerationTargetType.Live => action is ModerationAction.ContentRemoved or ModerationAction.LiveSuspended or ModerationAction.AccountBanned,
        ModerationTargetType.MarketplaceListing => action is ModerationAction.ContentRemoved or ModerationAction.MarketplaceSuspended or ModerationAction.AccountBanned,
        ModerationTargetType.User => action is ModerationAction.PostSuspended or ModerationAction.ReelSuspended or ModerationAction.LiveSuspended or ModerationAction.MarketplaceSuspended or ModerationAction.AccountBanned,
        _ => false
    };
    private sealed record TargetDescription(string Title, Guid OwnerId, string OwnerName, bool Exists, string AdminPath, string PublicPath)
    {
        public static TargetDescription Missing(ModerationTargetType type, Guid id) => new($"Đối tượng {type} đã bị xóa", Guid.Empty, "Không xác định", false, "", "");
    }
}

public sealed class ResolveModerationReportRequest
{
    [EnumDataType(typeof(ModerationAction))] public ModerationAction Action { get; init; }
    public bool Dismiss { get; init; }
    [StringLength(2000)] public string? Note { get; init; }
}
