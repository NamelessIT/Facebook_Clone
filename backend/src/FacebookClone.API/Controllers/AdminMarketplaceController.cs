using System.ComponentModel.DataAnnotations;
using FacebookClone.API.Common;
using FacebookClone.API.Services;
using FacebookClone.Domain.Enums;
using FacebookClone.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.API.Controllers;

[ApiController, Authorize, Route("api/v1/admin/marketplace")]
public class AdminMarketplaceController(AppDbContext db, LiveAccessService access) : ControllerBase
{
    [HttpGet("listings")]
    public async Task<IActionResult> Listings([FromQuery] string? search = null, [FromQuery] MarketplaceListingStatus? status = null)
    {
        if (!await HasPermission("marketplace.view")) return Forbid();
        var query = db.MarketplaceListings.AsNoTracking().Include(x => x.Seller).Include(x => x.Favorites).AsQueryable();
        if (status.HasValue) query = query.Where(x => x.Status == status.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var value = search.Trim().ToLower();
            query = query.Where(x => x.Title.ToLower().Contains(value) || x.Seller.Email.ToLower().Contains(value));
        }
        var items = await query.OrderByDescending(x => x.CreatedAt).Take(200).Select(x => new
        {
            x.Id, x.SellerId, SellerName = x.Seller.FirstName + " " + x.Seller.LastName, x.Seller.Email,
            x.Seller.IsMarketplaceSuspended, x.Seller.MarketplaceSuspensionReason, x.Title, x.Description, x.Price,
            x.Currency, x.Category, x.Condition, x.Location, x.ImageUrl, Status = (int)x.Status, x.DisplayFee,
            x.PaymentTransactionId,
            PaymentStatus = x.PaymentTransactionId == null ? (int?)null : (int?)x.PaymentTransaction!.Status,
            PaymentReference = x.PaymentTransactionId == null ? null : x.PaymentTransaction!.ReferenceCode,
            x.TermsVersion, x.TermsAcceptedAt, x.ViewCount, FavoriteCount = x.Favorites.Count,
            ReportCount = db.ModerationReports.Count(r => r.TargetType == ModerationTargetType.MarketplaceListing && r.TargetId == x.Id),
            x.CreatedAt, x.ReviewedAt, x.ModerationNote, x.IsDeleted
        }).ToListAsync();
        return Ok(new { success = true, data = items });
    }

    [HttpGet("payments")]
    public async Task<IActionResult> Payments([FromQuery] MarketplacePaymentStatus? status = null)
    {
        if (!await HasPermission("marketplace.view")) return Forbid();
        var query = db.MarketplacePaymentTransactions.AsNoTracking().Include(x => x.User).AsQueryable();
        if (status.HasValue) query = query.Where(x => x.Status == status.Value);
        var payments = await query.OrderByDescending(x => x.CreatedAt).Take(200).Select(x => new
        {
            x.Id,
            x.UserId,
            UserName = x.User.FirstName + " " + x.User.LastName,
            x.User.Email,
            x.Amount,
            x.Currency,
            x.ReferenceCode,
            Status = (int)x.Status,
            x.CreatedAt,
            x.ExpiresAt,
            x.SubmittedAt,
            x.VerifiedAt,
            x.VerifiedById,
            x.FailureReason,
            ListingId = x.Listing == null ? (Guid?)null : x.Listing.Id
        }).ToListAsync();
        return Ok(new { success = true, data = payments });
    }

    [HttpPut("payments/{id:guid}/review")]
    public async Task<IActionResult> ReviewPayment(Guid id, [FromBody] ReviewMarketplacePaymentRequest request)
    {
        if (!await HasPermission("marketplace.manage")) return Forbid();
        if (!request.Successful && string.IsNullOrWhiteSpace(request.Note))
            return BadRequest(new { success = false, message = "Cần nhập lý do khi xác nhận thanh toán thất bại." });

        var payment = await db.MarketplacePaymentTransactions
            .Include(x => x.Listing)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (payment == null) return NotFound(new { success = false, message = "Không tìm thấy giao dịch." });
        if (payment.Status != MarketplacePaymentStatus.AwaitingVerification)
            return Conflict(new { success = false, message = "Chỉ giao dịch đang chờ xác minh mới có thể được xử lý." });

        await using var transaction = await db.Database.BeginTransactionAsync(HttpContext.RequestAborted);
        payment.Status = request.Successful ? MarketplacePaymentStatus.Consumed : MarketplacePaymentStatus.Failed;
        payment.FailureReason = request.Successful ? null : request.Note!.Trim();
        payment.VerifiedAt = DateTime.UtcNow;
        payment.VerifiedById = UserContext.GetUserId(User);
        payment.UpdatedAt = DateTime.UtcNow;
        if (request.Successful && payment.Listing != null)
        {
            if (payment.Listing.Status != MarketplaceListingStatus.AwaitingPayment)
                return Conflict(new { success = false, message = "Bản nháp mặt hàng không còn ở trạng thái chờ thanh toán." });
            payment.Listing.Status = MarketplaceListingStatus.PendingReview;
            payment.Listing.ModerationNote = null;
            payment.Listing.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
        await transaction.CommitAsync(HttpContext.RequestAborted);
        return Ok(new
        {
            success = true,
            message = request.Successful
                ? "Đã xác nhận thanh toán thành công. Mặt hàng đã tự động được gửi kiểm duyệt."
                : "Đã đánh dấu giao dịch thất bại và gửi lý do cho người bán."
        });
    }

    [HttpGet("merchants/{sellerId:guid}/stats")]
    public async Task<IActionResult> MerchantStats(Guid sellerId)
    {
        if (!await HasPermission("marketplace.view")) return Forbid();
        var seller = await db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == sellerId && !x.IsDeleted);
        if (seller == null) return NotFound();
        var query = db.MarketplaceListings.AsNoTracking().Where(x => x.SellerId == sellerId && !x.IsDeleted);
        var ids = await query.Select(x => x.Id).ToListAsync();
        return Ok(new { success = true, data = new
        {
            seller = new { seller.Id, seller.FullName, seller.Email, seller.IsMarketplaceSuspended, seller.MarketplaceSuspensionReason },
            total = await query.CountAsync(), active = await query.CountAsync(x => x.Status == MarketplaceListingStatus.Approved),
            pending = await query.CountAsync(x => x.Status == MarketplaceListingStatus.PendingReview),
            sold = await query.CountAsync(x => x.Status == MarketplaceListingStatus.Sold),
            removed = await query.CountAsync(x => x.Status == MarketplaceListingStatus.Removed || x.Status == MarketplaceListingStatus.Rejected),
            views = await query.SumAsync(x => (int?)x.ViewCount) ?? 0,
            favorites = await db.MarketplaceFavorites.CountAsync(x => ids.Contains(x.ListingId)),
            reports = await db.ModerationReports.CountAsync(x => x.TargetType == ModerationTargetType.MarketplaceListing && ids.Contains(x.TargetId)),
            displayFees = await query
                .Where(x => x.Status != MarketplaceListingStatus.AwaitingPayment)
                .SumAsync(x => (decimal?)x.DisplayFee) ?? 0
        }});
    }

    [HttpPut("listings/{id:guid}/review")]
    public async Task<IActionResult> Review(Guid id, [FromBody] ReviewMarketplaceListingRequest request)
    {
        if (!await HasPermission("marketplace.manage")) return Forbid();
        if (request.Status is not (MarketplaceListingStatus.Approved or MarketplaceListingStatus.Rejected or MarketplaceListingStatus.Removed))
            return BadRequest(new { success = false, message = "Trạng thái kiểm duyệt không hợp lệ." });
        var item = await db.MarketplaceListings.FirstOrDefaultAsync(x => x.Id == id);
        if (item == null) return NotFound();
        if (request.Status == MarketplaceListingStatus.Approved && item.Status != MarketplaceListingStatus.PendingReview)
            return Conflict(new { success = false, message = "Chỉ mặt hàng đã thanh toán và đang chờ duyệt mới có thể được phê duyệt." });
        item.Status = request.Status; item.ModerationNote = request.Note?.Trim(); item.ReviewedAt = DateTime.UtcNow;
        item.ReviewedById = UserContext.GetUserId(User); item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { success = true, message = request.Status == MarketplaceListingStatus.Approved ? "Mặt hàng đã được duyệt." : "Mặt hàng đã bị từ chối hoặc gỡ." });
    }

    [HttpPut("merchants/{sellerId:guid}/suspension")]
    public async Task<IActionResult> SetMerchantSuspension(Guid sellerId, [FromBody] MarketplaceSellerSuspensionRequest request)
    {
        if (!await HasPermission("marketplace.suspend_seller")) return Forbid();
        var seller = await db.Users.FirstOrDefaultAsync(x => x.Id == sellerId && !x.IsDeleted);
        if (seller == null) return NotFound();
        if (seller.IsAdmin) return BadRequest(new { success = false, message = "Không thể khóa quyền Marketplace của quản trị viên." });
        if (request.Suspended && string.IsNullOrWhiteSpace(request.Reason)) return BadRequest(new { success = false, message = "Cần nhập lý do khóa quyền bán hàng." });
        seller.IsMarketplaceSuspended = request.Suspended;
        seller.MarketplaceSuspensionReason = request.Suspended ? request.Reason!.Trim() : null;
        seller.MarketplaceSuspendedAt = request.Suspended ? DateTime.UtcNow : null;
        seller.UpdatedAt = DateTime.UtcNow;
        if (request.Suspended)
        {
            var active = await db.MarketplaceListings.Where(x => x.SellerId == sellerId && x.Status == MarketplaceListingStatus.Approved).ToListAsync();
            foreach (var item in active) { item.Status = MarketplaceListingStatus.Removed; item.ModerationNote = request.Reason!.Trim(); item.UpdatedAt = DateTime.UtcNow; }
        }
        await db.SaveChangesAsync();
        return Ok(new { success = true, message = request.Suspended ? "Đã khóa quyền bán hàng và gỡ mặt hàng đang hiển thị." : "Đã mở lại quyền bán hàng." });
    }

    private Task<bool> HasPermission(string key) => access.HasPermissionAsync(UserContext.GetUserId(User), key);
}

public sealed class ReviewMarketplaceListingRequest
{
    [EnumDataType(typeof(MarketplaceListingStatus))] public MarketplaceListingStatus Status { get; init; }
    [StringLength(1000)] public string? Note { get; init; }
}
public sealed record MarketplaceSellerSuspensionRequest(bool Suspended, string? Reason);
public sealed record ReviewMarketplacePaymentRequest(bool Successful, string? Note);
