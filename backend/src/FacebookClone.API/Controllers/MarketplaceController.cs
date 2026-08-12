using System.ComponentModel.DataAnnotations;
using FacebookClone.API.Common;
using FacebookClone.API.Services;
using FacebookClone.Application.DTOs.Chat;
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
    MarketplaceSettingsService marketplaceSettings,
    IChatService chatService) : ControllerBase
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
    public async Task<IActionResult> Terms()
    {
        var payment = await marketplaceSettings.GetPaymentSettingsAsync(HttpContext.RequestAborted);
        return Ok(new { success = true, data = new
        {
            version = MarketplacePolicy.CurrentTermsVersion,
            displayFee = await marketplaceSettings.GetDisplayFeeAsync(HttpContext.RequestAborted),
            currency = "VND",
            path = "/marketplace-terms.md",
            payment = PublicPaymentSettings(payment)
        }});
    }

    [HttpPost("{listingId:guid}/payments")]
    public async Task<IActionResult> CreatePayment(Guid listingId)
    {
        var userId = UserContext.GetUserId(User);
        var seller = await db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId && !x.IsDeleted);
        if (seller == null || seller.IsBanned) return Unauthorized();
        if (seller.IsMarketplaceSuspended)
            return StatusCode(StatusCodes.Status423Locked, new { success = false, message = seller.MarketplaceSuspensionReason ?? "Quyền bán hàng đang bị tạm khóa." });

        var listing = await db.MarketplaceListings
            .FirstOrDefaultAsync(x => x.Id == listingId && x.SellerId == userId && !x.IsDeleted);
        if (listing == null) return NotFound(new { success = false, message = "Không tìm thấy bản nháp mặt hàng." });
        if (listing.Status != MarketplaceListingStatus.AwaitingPayment)
            return Conflict(new { success = false, message = "Mặt hàng này không còn ở bước thanh toán." });

        var paymentSettings = await marketplaceSettings.GetPaymentSettingsAsync(HttpContext.RequestAborted);
        if (!paymentSettings.IsConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                success = false,
                message = "Quản trị viên chưa cấu hình tài khoản nhận phí Marketplace. Vui lòng liên hệ quản trị viên."
            });

        var now = DateTime.UtcNow;
        var existing = listing.PaymentTransactionId == null ? null : await db.MarketplacePaymentTransactions
            .Where(x => x.Id == listing.PaymentTransactionId && x.UserId == userId &&
                (x.Status == MarketplacePaymentStatus.AwaitingVerification ||
                 (x.Status == MarketplacePaymentStatus.Pending && x.ExpiresAt > now)))
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync();
        if (existing != null)
            return Ok(new { success = true, data = PaymentResponse(existing, paymentSettings) });

        var id = Guid.NewGuid();
        var transaction = new MarketplacePaymentTransaction
        {
            Id = id,
            UserId = userId,
            Amount = listing.DisplayFee,
            Currency = "VND",
            ReferenceCode = ($"MKT{id:N}")[..18].ToUpperInvariant(),
            Status = MarketplacePaymentStatus.Pending,
            CreatedAt = now,
            UpdatedAt = now,
            ExpiresAt = now.Add(MarketplacePolicy.PaymentLifetime)
        };
        db.MarketplacePaymentTransactions.Add(transaction);
        listing.PaymentTransactionId = transaction.Id;
        listing.UpdatedAt = now;
        await db.SaveChangesAsync();
        return Ok(new { success = true, data = PaymentResponse(transaction, paymentSettings) });
    }

    [HttpGet("payments/{id:guid}")]
    public async Task<IActionResult> GetPayment(Guid id)
    {
        var userId = UserContext.GetUserId(User);
        var transaction = await db.MarketplacePaymentTransactions.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId);
        if (transaction == null) return NotFound(new { success = false, message = "Không tìm thấy giao dịch." });
        await ExpirePaymentIfNeeded(transaction);
        var paymentSettings = await marketplaceSettings.GetPaymentSettingsAsync(HttpContext.RequestAborted);
        return Ok(new { success = true, data = PaymentResponse(transaction, paymentSettings) });
    }

    [HttpPost("payments/{id:guid}/submit")]
    public async Task<IActionResult> SubmitPayment(Guid id)
    {
        var userId = UserContext.GetUserId(User);
        var transaction = await db.MarketplacePaymentTransactions.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId);
        if (transaction == null) return NotFound(new { success = false, message = "Không tìm thấy giao dịch." });
        await ExpirePaymentIfNeeded(transaction);
        if (transaction.Status == MarketplacePaymentStatus.Failed)
            return Conflict(new { success = false, message = transaction.FailureReason ?? "Giao dịch không còn hiệu lực." });
        if (transaction.Status != MarketplacePaymentStatus.Pending)
            return Ok(new { success = true, data = PaymentResponse(transaction, await marketplaceSettings.GetPaymentSettingsAsync()) });

        transaction.Status = MarketplacePaymentStatus.AwaitingVerification;
        transaction.SubmittedAt = DateTime.UtcNow;
        transaction.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new
        {
            success = true,
            message = "Đã ghi nhận yêu cầu xác minh. Mặt hàng chỉ được đăng sau khi quản trị viên xác nhận tiền đã vào tài khoản.",
            data = PaymentResponse(transaction, await marketplaceSettings.GetPaymentSettingsAsync())
        });
    }

    [HttpPost("payments/{id:guid}/cancel")]
    public async Task<IActionResult> CancelPayment(Guid id)
    {
        var userId = UserContext.GetUserId(User);
        var transaction = await db.MarketplacePaymentTransactions.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId);
        if (transaction == null) return NotFound();
        if (transaction.Status is MarketplacePaymentStatus.Consumed or MarketplacePaymentStatus.Succeeded)
            return Conflict(new { success = false, message = "Giao dịch đã thành công nên không thể hủy." });
        transaction.Status = MarketplacePaymentStatus.Cancelled;
        transaction.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { success = true });
    }

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

        // Check the receiver account before uploading the image. This keeps a
        // configuration error from leaving an orphaned file on the server.
        var paymentSettings = await marketplaceSettings.GetPaymentSettingsAsync(HttpContext.RequestAborted);
        if (!paymentSettings.IsConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { success = false, message = "Quản trị viên chưa cấu hình tài khoản nhận phí Marketplace." });

        var now = DateTime.UtcNow;
        await using var databaseTransaction = await db.Database.BeginTransactionAsync(HttpContext.RequestAborted);
        var listing = new MarketplaceListing
        {
            Id = Guid.NewGuid(), SellerId = userId, Title = request.Title.Trim(), Description = request.Description.Trim(),
            Price = request.Price, Category = request.Category, Condition = request.Condition.Trim(), Location = request.Location.Trim(),
            ImageUrl = await files.UploadImageAsync(request.Image, "marketplace"), Status = MarketplaceListingStatus.AwaitingPayment,
            DisplayFee = await marketplaceSettings.GetDisplayFeeAsync(HttpContext.RequestAborted), TermsVersion = MarketplacePolicy.CurrentTermsVersion,
            TermsAcceptedAt = now, CreatedAt = now, UpdatedAt = now
        };
        db.MarketplaceListings.Add(listing);
        await db.SaveChangesAsync();

        var paymentId = Guid.NewGuid();
        var payment = new MarketplacePaymentTransaction
        {
            Id = paymentId, UserId = userId, Amount = listing.DisplayFee, Currency = "VND",
            ReferenceCode = ($"MKT{paymentId:N}")[..18].ToUpperInvariant(), Status = MarketplacePaymentStatus.Pending,
            CreatedAt = now, UpdatedAt = now, ExpiresAt = now.Add(MarketplacePolicy.PaymentLifetime)
        };
        db.MarketplacePaymentTransactions.Add(payment);
        listing.PaymentTransactionId = payment.Id;
        await db.SaveChangesAsync();
        await databaseTransaction.CommitAsync(HttpContext.RequestAborted);
        listing.Seller = seller;
        return CreatedAtAction(nameof(Get), new { id = listing.Id }, new
        {
            success = true,
            message = "Đã lưu bản nháp mặt hàng. Hoàn tất thanh toán để hệ thống tự gửi kiểm duyệt.",
            data = new { listing = ToResponse(listing, userId), payment = PaymentResponse(payment, paymentSettings) }
        });
    }

    [HttpPut("{id:guid}"), DisableRequestSizeLimit, Consumes("multipart/form-data")]
    public async Task<IActionResult> Update(Guid id, [FromForm] UpdateMarketplaceListingRequest request)
    {
        var userId = UserContext.GetUserId(User);
        var item = await db.MarketplaceListings.Include(x => x.Seller).Include(x => x.Favorites)
            .FirstOrDefaultAsync(x => x.Id == id && x.SellerId == userId && !x.IsDeleted);
        if (item == null) return NotFound(new { success = false, message = "Không tìm thấy mặt hàng." });
        if (item.Status is MarketplaceListingStatus.Sold or MarketplaceListingStatus.Removed)
            return Conflict(new { success = false, message = "Mặt hàng đã đóng nên không thể chỉnh sửa." });
        if (!MarketplacePolicy.Categories.Contains(request.Category))
            return BadRequest(new { success = false, message = "Danh mục sản phẩm không hợp lệ." });
        if (request.Image is { Length: > MarketplacePolicy.MaxImageBytes })
            return BadRequest(new { success = false, message = "Ảnh sản phẩm không được vượt quá 10 MB." });

        item.Title = request.Title.Trim();
        item.Description = request.Description.Trim();
        item.Price = request.Price;
        item.Category = request.Category;
        item.Condition = request.Condition.Trim();
        item.Location = request.Location.Trim();
        if (request.Image is { Length: > 0 }) item.ImageUrl = await files.UploadImageAsync(request.Image, "marketplace");
        if (item.Status is MarketplaceListingStatus.Approved or MarketplaceListingStatus.Rejected)
        {
            item.Status = MarketplaceListingStatus.PendingReview;
            item.ModerationNote = "Thông tin đã được người bán cập nhật và cần kiểm duyệt lại.";
            item.ReviewedAt = null;
            item.ReviewedById = null;
        }
        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { success = true, message = "Đã cập nhật mặt hàng.", data = ToResponse(item, userId) });
    }

    [HttpPut("{id:guid}/withdraw")]
    public async Task<IActionResult> Withdraw(Guid id)
    {
        var userId = UserContext.GetUserId(User);
        var item = await db.MarketplaceListings.Include(x => x.PaymentTransaction)
            .FirstOrDefaultAsync(x => x.Id == id && x.SellerId == userId && !x.IsDeleted);
        if (item == null) return NotFound();
        if (item.Status == MarketplaceListingStatus.Removed) return Ok(new { success = true });
        if (item.PaymentTransaction?.Status == MarketplacePaymentStatus.AwaitingVerification)
            return Conflict(new
            {
                success = false,
                message = "Giao dịch đang được đối soát. Vui lòng chờ kết quả hoặc liên hệ quản trị viên trước khi thu hồi mặt hàng."
            });
        if (item.PaymentTransaction?.Status == MarketplacePaymentStatus.Pending)
        {
            item.PaymentTransaction.Status = MarketplacePaymentStatus.Cancelled;
            item.PaymentTransaction.UpdatedAt = DateTime.UtcNow;
        }
        item.Status = MarketplaceListingStatus.Removed;
        item.ModerationNote = "Người bán đã chủ động thu hồi mặt hàng.";
        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { success = true, message = "Đã thu hồi mặt hàng khỏi Marketplace." });
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
            awaitingPayment = await query.CountAsync(x => x.Status == MarketplaceListingStatus.AwaitingPayment),
            pending = await query.CountAsync(x => x.Status == MarketplaceListingStatus.PendingReview),
            active = await query.CountAsync(x => x.Status == MarketplaceListingStatus.Approved),
            sold = await query.CountAsync(x => x.Status == MarketplaceListingStatus.Sold),
            rejected = await query.CountAsync(x => x.Status == MarketplaceListingStatus.Rejected || x.Status == MarketplaceListingStatus.Removed),
            views = await query.SumAsync(x => (int?)x.ViewCount) ?? 0,
            favorites = await db.MarketplaceFavorites.CountAsync(x => ids.Contains(x.ListingId)),
            reports,
            displayFees = await db.MarketplacePaymentTransactions
                .Where(x => x.UserId == userId &&
                    (x.Status == MarketplacePaymentStatus.Succeeded || x.Status == MarketplacePaymentStatus.Consumed))
                .SumAsync(x => (decimal?)x.Amount) ?? 0,
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

    [HttpPost("{id:guid}/contact")]
    public async Task<IActionResult> ContactSeller(Guid id)
    {
        var userId = UserContext.GetUserId(User);
        var item = await db.MarketplaceListings.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted && x.Status == MarketplaceListingStatus.Approved);
        if (item == null)
            return NotFound(new { success = false, message = "Không tìm thấy mặt hàng đang được hiển thị." });
        if (item.SellerId == userId)
            return BadRequest(new { success = false, message = "Bạn không thể liên hệ chính mình về mặt hàng này." });

        var message = await chatService.SendMessageAsync(
            userId,
            new SendMessageRequest
            {
                ReceiverId = item.SellerId,
                Content = $"Xin chào, tôi quan tâm đến mặt hàng “{item.Title}” trên Marketplace.",
                MessageType = MessageType.Text
            },
            HttpContext.TraceIdentifier,
            allowNonFriendConversation: true);

        return Ok(new
        {
            success = true,
            message = "Đã mở cuộc trò chuyện với người bán.",
            data = new { message.ConversationId, SellerId = item.SellerId, Message = message }
        });
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

    [HttpPost("{id:guid}/relist")]
    public async Task<IActionResult> Relist(Guid id, [FromBody] RelistMarketplaceListingRequest request)
    {
        var userId = UserContext.GetUserId(User);
        var seller = await db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId && !x.IsDeleted);
        if (seller == null || seller.IsBanned) return Unauthorized();
        if (seller.IsMarketplaceSuspended)
            return StatusCode(StatusCodes.Status423Locked, new
            {
                success = false,
                message = seller.MarketplaceSuspensionReason ?? "Quyền bán hàng đang bị tạm khóa."
            });
        if (!request.AcceptTerms || request.TermsVersion != MarketplacePolicy.CurrentTermsVersion)
            return BadRequest(new
            {
                success = false,
                message = "Bạn phải đọc và đồng ý đúng phiên bản điều khoản Marketplace hiện hành."
            });

        var paymentSettings = await marketplaceSettings.GetPaymentSettingsAsync(HttpContext.RequestAborted);
        if (!paymentSettings.IsConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                success = false,
                message = "Quản trị viên chưa cấu hình tài khoản nhận phí Marketplace."
            });

        var item = await db.MarketplaceListings.Include(x => x.Seller).Include(x => x.Favorites)
            .FirstOrDefaultAsync(x => x.Id == id && x.SellerId == userId && !x.IsDeleted);
        if (item == null) return NotFound(new { success = false, message = "Không tìm thấy mặt hàng." });
        if (item.Status != MarketplaceListingStatus.Sold)
            return Conflict(new
            {
                success = false,
                message = "Chỉ mặt hàng đã bán mới có thể bắt đầu một lượt trưng bày mới."
            });

        var now = DateTime.UtcNow;
        item.Status = MarketplaceListingStatus.AwaitingPayment;
        item.DisplayFee = await marketplaceSettings.GetDisplayFeeAsync(HttpContext.RequestAborted);
        item.PaymentTransactionId = null;
        item.TermsVersion = MarketplacePolicy.CurrentTermsVersion;
        item.TermsAcceptedAt = now;
        item.ModerationNote = "Đăng bán lại: hãy cập nhật thông tin và thanh toán phí trưng bày mới.";
        item.ReviewedAt = null;
        item.ReviewedById = null;
        item.UpdatedAt = now;
        await db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Đã tạo lượt đăng bán lại. Hãy kiểm tra thông tin và thanh toán phí trưng bày mới.",
            data = ToResponse(item, userId)
        });
    }

    private async Task<bool> CanModerateAsync(Guid userId) => await db.Users.AsNoTracking().AnyAsync(x => x.Id == userId &&
        (x.IsAdmin || x.UserRoles.Any(ur => ur.Role.RolePermissions.Any(rp => rp.Permission.Key == "marketplace.view"))));

    private async Task ExpirePaymentIfNeeded(MarketplacePaymentTransaction transaction)
    {
        if (transaction.Status != MarketplacePaymentStatus.Pending || transaction.ExpiresAt > DateTime.UtcNow) return;
        transaction.Status = MarketplacePaymentStatus.Failed;
        transaction.FailureReason = "Giao dịch đã hết thời hạn thanh toán. Vui lòng tạo giao dịch mới.";
        transaction.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    private static object PublicPaymentSettings(MarketplacePaymentSettings payment) => new
    {
        payment.IsConfigured,
        payment.BankBin,
        payment.BankName,
        payment.AccountNumber,
        payment.AccountName,
        payment.SupportEmail
    };

    private static object PaymentResponse(MarketplacePaymentTransaction transaction, MarketplacePaymentSettings settings)
    {
        var addInfo = Uri.EscapeDataString(transaction.ReferenceCode);
        var accountName = Uri.EscapeDataString(settings.AccountName);
        var qrImageUrl = settings.IsConfigured
            ? $"https://img.vietqr.io/image/{settings.BankBin}-{settings.AccountNumber}-compact2.png?amount={transaction.Amount:0}&addInfo={addInfo}&accountName={accountName}"
            : string.Empty;
        return new
        {
            transaction.Id,
            transaction.Amount,
            transaction.Currency,
            transaction.ReferenceCode,
            Status = (int)transaction.Status,
            transaction.CreatedAt,
            transaction.ExpiresAt,
            transaction.SubmittedAt,
            transaction.VerifiedAt,
            transaction.FailureReason,
            QrImageUrl = qrImageUrl,
            Payment = PublicPaymentSettings(settings)
        };
    }

    private static object ToResponse(MarketplaceListing x, Guid userId) => new
    {
        x.Id, x.SellerId, SellerName = x.Seller.FullName, SellerEmail = x.Seller.Email, x.Title, x.Description,
        x.Price, x.Currency, x.Category, x.Condition, x.Location, x.ImageUrl, Status = (int)x.Status,
        x.DisplayFee, x.PaymentTransactionId, x.TermsVersion, x.TermsAcceptedAt, x.ViewCount, FavoriteCount = x.Favorites.Count,
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

public sealed class UpdateMarketplaceListingRequest
{
    [Required, StringLength(160, MinimumLength = 3)] public string Title { get; init; } = string.Empty;
    [Required, StringLength(3000, MinimumLength = 10)] public string Description { get; init; } = string.Empty;
    [Range(1, 1_000_000_000_000)] public decimal Price { get; init; }
    [Required] public string Category { get; init; } = string.Empty;
    [Required, StringLength(80)] public string Condition { get; init; } = string.Empty;
    [Required, StringLength(160)] public string Location { get; init; } = string.Empty;
    public IFormFile? Image { get; init; }
}

public sealed class RelistMarketplaceListingRequest
{
    public bool AcceptTerms { get; init; }
    [Required] public string TermsVersion { get; init; } = string.Empty;
}
