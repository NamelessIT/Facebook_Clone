using FacebookClone.API.Common;
using FacebookClone.API.Services;
using FacebookClone.Domain.Policies;
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

        var fee = await marketplaceSettings.UpdateDisplayFeeAsync(
            request.DisplayFee, userId, HttpContext.RequestAborted);
        return Ok(new { success = true, data = new { displayFee = fee, currency = "VND" } });
    }
}

public sealed record UpdateMarketplaceSettingsRequest(decimal DisplayFee);
