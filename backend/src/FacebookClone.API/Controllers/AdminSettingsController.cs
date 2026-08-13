using FacebookClone.API.Common;
using FacebookClone.API.Services;
using FacebookClone.Domain.Policies;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FacebookClone.API.Controllers;

[ApiController, Authorize, Route("api/v1/admin/settings")]
public class AdminSettingsController(
    LiveAccessService access,
    MarketplaceSettingsService marketplaceSettings) : ControllerBase
{
    [HttpGet("marketplace")]
    public async Task<IActionResult> GetMarketplaceSettings()
    {
        var userId = UserContext.GetUserId(User);
        if (!await access.HasPermissionAsync(userId, "settings.manage")) return Forbid();

        return Ok(new
        {
            success = true,
            data = new
            {
                displayFee = await marketplaceSettings.GetDisplayFeeAsync(HttpContext.RequestAborted),
                categories = await marketplaceSettings.GetCategoryFeesAsync(HttpContext.RequestAborted),
                payment = await marketplaceSettings.GetPaymentSettingsAsync(HttpContext.RequestAborted),
                currency = "VND",
                minDisplayFee = MarketplacePolicy.MinDisplayFeeVnd,
                maxDisplayFee = MarketplacePolicy.MaxDisplayFeeVnd
            }
        });
    }

    [HttpPut("marketplace")]
    public async Task<IActionResult> UpdateMarketplaceSettings([FromBody] UpdateMarketplaceSettingsRequest request)
    {
        var userId = UserContext.GetUserId(User);
        if (!await access.HasPermissionAsync(userId, "settings.manage")) return Forbid();
        if (request.DisplayFee < MarketplacePolicy.MinDisplayFeeVnd ||
            request.DisplayFee > MarketplacePolicy.MaxDisplayFeeVnd)
        {
            return BadRequest(new
            {
                success = false,
                message = $"Display fee must be between {MarketplacePolicy.MinDisplayFeeVnd} and {MarketplacePolicy.MaxDisplayFeeVnd} VND."
            });
        }
        if (request.Categories is not { Count: > 0 and <= 50 } || request.Categories.Any(x =>
            string.IsNullOrWhiteSpace(x.Name) || x.Name.Trim().Length > 80 ||
            x.DisplayFee < MarketplacePolicy.MinDisplayFeeVnd || x.DisplayFee > MarketplacePolicy.MaxDisplayFeeVnd) ||
            request.Categories.Select(x => x.Name.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).Count() != request.Categories.Count)
        {
            return BadRequest(new { success = false, message = "Danh mục phải có tên duy nhất và mức phí hợp lệ." });
        }

        var payment = new MarketplacePaymentSettings(
            request.BankBin,
            request.BankName,
            request.AccountNumber,
            request.AccountName,
            request.SupportEmail);
        var updated = await marketplaceSettings.UpdateAsync(
            request.DisplayFee, payment, request.Categories, userId, HttpContext.RequestAborted);
        return Ok(new
        {
            success = true,
            data = new { displayFee = request.DisplayFee, categories = await marketplaceSettings.GetCategoryFeesAsync(HttpContext.RequestAborted), currency = "VND", payment = updated }
        });
    }
}

public sealed record UpdateMarketplaceSettingsRequest(
    decimal DisplayFee,
    [Required, MinLength(1), MaxLength(50)] IReadOnlyList<MarketplaceCategoryFee> Categories,
    [Required, RegularExpression("^[0-9]{6}$")] string BankBin,
    [Required, StringLength(120)] string BankName,
    [Required, RegularExpression("^[0-9]{6,24}$")] string AccountNumber,
    [Required, StringLength(160)] string AccountName,
    [Required, EmailAddress, StringLength(254)] string SupportEmail);
