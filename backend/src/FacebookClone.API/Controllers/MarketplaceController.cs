using System.ComponentModel.DataAnnotations;
using FacebookClone.API.Common;
using FacebookClone.API.Services;
using FacebookClone.Application.Services.Interfaces;
using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Policies;
using FacebookClone.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.API.Controllers;

[ApiController, Authorize, Route("api/v1/marketplace")]
public class MarketplaceController(
    AppDbContext db,
    IFileService files,
    MarketplaceSettingsService marketplaceSettings) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? search = null, [FromQuery] string? category = null)
    {
        var userId = UserContext.GetUserId(User);
        var query = db.MarketplaceListings.AsNoTracking()
            .Include(x => x.Seller).Include(x => x.Favorites)
            .Where(x => !x.IsDeleted && x.Status == MarketplaceListingStatus.Approved);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var value = search.Trim().ToLower();
            query = query.Where(x => x.Title.ToLower().Contains(value) || x.Location.ToLower().Contains(value) ||
                x.Seller.FirstName.ToLower().Contains(value) || x.Seller.LastName.ToLower().Contains(value));
        }
        if (!string.IsNullOrWhiteSpace(category) && category != "Tất cả")
            query = query.Where(x => x.Category == category);
        var items = await query.OrderByDescending(x => x.CreatedAt).Take(100).ToListAsync();
        return Ok(new { success = true, data = items.Select(x => ToResponse(x, userId)) });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var userId = UserContext.GetUserId(User);
        var item = await db.MarketplaceListings.Include(x => x.Seller).Include(x => x.Favorites)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (item == null) return NotFound(new { success = false, message = "Không tìm thấy mặt hàng." });
        var canModerate = await CanModerateAsync(userId);
        if (item.Status != MarketplaceListingStatus.Approved && item.SellerId != userId && !canModerate) return Forbid();
        if (item.SellerId != userId) { item.ViewCount++; await db.SaveChangesAsync(); }
        return Ok(new { success = true, data = ToResponse(item, userId) });
    }

    [HttpGet("terms")]
    public async Task<IActionResult> Terms() => Ok(new { success = true, data = new
    {
        version = MarketplacePolicy.CurrentTermsVersion,
        displayFee = await marketplaceSettings.GetDisplayFeeAsync(HttpContext.RequestAborted),
        currency = "VND",
        path = "/marketplace-terms.md"
    }});

    [HttpPost, DisableRequestSizeLimit, Consumes("multipart/form-data")]
    public async Task<IActionResult> Create([FromForm] CreateMarketplaceListingRequest request)
    {
        var userId = UserContext.GetUserId(User);
        var seller = await db.Users.FirstOrDefaultAsync(x => x.Id == userId && !x.IsDeleted);
        if (seller == null || seller.IsBanned) return Unauthorized();
        if (seller.IsMarketplaceSuspended)
            return StatusCode(StatusCodes.Status423Locked, new { success = false, message = seller.MarketplaceSuspensionReason ?? "Quyền bán hàng đang bị tạm khóa." });
        if (!request.AcceptTerms || request.TermsVersion != MarketplacePolicy.CurrentTermsVersion)
            return BadRequest(new { success = false, message = "Bạn phải đọc và đồng ý đúng phiên bản điều khoản Marketplace hiện hành." });
        if (request.Image == null || request.Image.Length == 0 || request.Image.Length > MarketplacePolicy.MaxImageBytes)
            return BadRequest(new { success = false, message = "Ảnh sản phẩm là bắt buộc và không được vượt quá 10 MB." });
        if (!MarketplacePolicy.Categories.Contains(request.Category))
            return BadRequest(new { success = false, message = "Danh mục sản phẩm không hợp lệ." });

        var now = DateTime.UtcNow;
        var displayFee = await marketplaceSettings.GetDisplayFeeAsync(HttpContext.RequestAborted);
        var listing = new MarketplaceListing
        {
            Id = Guid.NewGuid(), SellerId = userId, Title = request.Title.Trim(), Description = request.Description.Trim(),
            Price = request.Price, Category = request.Category, Condition = request.Condition.Trim(), Location = request.Location.Trim(),
            ImageUrl = await files.UploadImageAsync(request.Image, "marketplace"), Status = MarketplaceListingStatus.PendingReview,
            DisplayFee = displayFee, TermsVersion = MarketplacePolicy.CurrentTermsVersion,
            TermsAcceptedAt = now, CreatedAt = now, UpdatedAt = now
        };
        db.MarketplaceListings.Add(listing);
        await db.SaveChangesAsync();
        listing.Seller = seller;
        return CreatedAtAction(nameof(Get), new { id = listing.Id }, new { success = true, message = "Mặt hàng đã được gửi kiểm duyệt.", data = ToResponse(listing, userId) });
    }

    [HttpGet("me/listings")]
    public async Task<IActionResult> Mine()
    {
        var userId = UserContext.GetUserId(User);
        var items = await db.MarketplaceListings.AsNoTracking().Include(x => x.Seller).Include(x => x.Favorites)
            .Where(x => x.SellerId == userId && !x.IsDeleted).OrderByDescending(x => x.CreatedAt).ToListAsync();
        return Ok(new { success = true, data = items.Select(x => ToResponse(x, userId)) });
    }

    [HttpGet("me/stats")]
    public async Task<IActionResult> Stats()
    {
        var userId = UserContext.GetUserId(User);
        var query = db.MarketplaceListings.AsNoTracking().Where(x => x.SellerId == userId && !x.IsDeleted);
        var ids = await query.Select(x => x.Id).ToListAsync();
        var reports = await db.ModerationReports.CountAsync(x => x.TargetType == ModerationTargetType.MarketplaceListing && ids.Contains(x.TargetId));
        return Ok(new { success = true, data = new
        {
            total = await query.CountAsync(),
            pending = await query.CountAsync(x => x.Status == MarketplaceListingStatus.PendingReview),
            active = await query.CountAsync(x => x.Status == MarketplaceListingStatus.Approved),
            sold = await query.CountAsync(x => x.Status == MarketplaceListingStatus.Sold),
            rejected = await query.CountAsync(x => x.Status == MarketplaceListingStatus.Rejected || x.Status == MarketplaceListingStatus.Removed),
            views = await query.SumAsync(x => (int?)x.ViewCount) ?? 0,
            favorites = await db.MarketplaceFavorites.CountAsync(x => ids.Contains(x.ListingId)),
            reports,
            displayFees = await query.SumAsync(x => (decimal?)x.DisplayFee) ?? 0,
            feePerListing = await marketplaceSettings.GetDisplayFeeAsync(HttpContext.RequestAborted)
        }});
    }

    [HttpPost("{id:guid}/favorite")]
    public async Task<IActionResult> ToggleFavorite(Guid id)
    {
        var userId = UserContext.GetUserId(User);
        if (!await db.MarketplaceListings.AnyAsync(x => x.Id == id && !x.IsDeleted && x.Status == MarketplaceListingStatus.Approved)) return NotFound();
        var favorite = await db.MarketplaceFavorites.FindAsync(id, userId);
        if (favorite == null) db.MarketplaceFavorites.Add(new MarketplaceFavorite { ListingId = id, UserId = userId, CreatedAt = DateTime.UtcNow });
        else db.MarketplaceFavorites.Remove(favorite);
        await db.SaveChangesAsync();
        return Ok(new { success = true, data = new { isFavorite = favorite == null, count = await db.MarketplaceFavorites.CountAsync(x => x.ListingId == id) } });
    }

    [HttpPut("{id:guid}/sold")]
    public async Task<IActionResult> MarkSold(Guid id)
    {
        var userId = UserContext.GetUserId(User);
        var item = await db.MarketplaceListings.FirstOrDefaultAsync(x => x.Id == id && x.SellerId == userId && !x.IsDeleted);
        if (item == null) return NotFound();
        if (item.Status != MarketplaceListingStatus.Approved) return Conflict(new { success = false, message = "Chỉ mặt hàng đang hiển thị mới có thể đánh dấu đã bán." });
        item.Status = MarketplaceListingStatus.Sold; item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { success = true, message = "Đã đánh dấu sản phẩm là đã bán." });
    }

    private async Task<bool> CanModerateAsync(Guid userId) => await db.Users.AsNoTracking().AnyAsync(x => x.Id == userId &&
        (x.IsAdmin || x.UserRoles.Any(ur => ur.Role.RolePermissions.Any(rp => rp.Permission.Key == "marketplace.view"))));

    private static object ToResponse(MarketplaceListing x, Guid userId) => new
    {
        x.Id, x.SellerId, SellerName = x.Seller.FullName, SellerEmail = x.Seller.Email, x.Title, x.Description,
        x.Price, x.Currency, x.Category, x.Condition, x.Location, x.ImageUrl, Status = (int)x.Status,
        x.DisplayFee, x.TermsVersion, x.TermsAcceptedAt, x.ViewCount, FavoriteCount = x.Favorites.Count,
        IsFavorite = x.Favorites.Any(f => f.UserId == userId), IsOwner = x.SellerId == userId,
        x.CreatedAt, x.UpdatedAt, x.ReviewedAt, x.ModerationNote
    };
}

public sealed class CreateMarketplaceListingRequest
{
    [Required, StringLength(160, MinimumLength = 3)] public string Title { get; init; } = string.Empty;
    [Required, StringLength(3000, MinimumLength = 10)] public string Description { get; init; } = string.Empty;
    [Range(1, 1_000_000_000_000)] public decimal Price { get; init; }
    [Required] public string Category { get; init; } = string.Empty;
    [Required, StringLength(80)] public string Condition { get; init; } = string.Empty;
    [Required, StringLength(160)] public string Location { get; init; } = string.Empty;
    [Required] public IFormFile? Image { get; init; }
    public bool AcceptTerms { get; init; }
    [Required] public string TermsVersion { get; init; } = string.Empty;
}
