using FacebookClone.Application.DTOs.Reel;
using FacebookClone.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FacebookClone.API.Controllers;

[Route("api/v1/[controller]")]
[ApiController]
[Authorize]
public class ReelsController : ControllerBase
{
    private readonly IReelService _reelService;

    public ReelsController(IReelService reelService)
    {
        _reelService = reelService;
    }

    private Guid GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(idClaim!);
    }

    [HttpPost]
    [DisableRequestSizeLimit] // 👈 Cho phép form đẩy dữ liệu lớn lên
    [RequestFormLimits(ValueLengthLimit = int.MaxValue, MultipartBodyLengthLimit = int.MaxValue)]
    public async Task<IActionResult> CreateReel([FromForm] CreateReelRequest request) // 👈 Đổi [FromBody] thành [FromForm]
    {
        try {
            var reel = await _reelService.CreateReelAsync(GetCurrentUserId(), request);
            return Ok(new { success = true, data = reel });
        } catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HttpGet("feed")]
    public async Task<IActionResult> GetReelsFeed([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        var reels = await _reelService.GetReelsFeedAsync(GetCurrentUserId(), pageNumber, pageSize);
        return Ok(new { success = true, data = reels });
    }

    [HttpPost("{id}/like")]
    public async Task<IActionResult> ToggleLike(Guid id)
    {
        try {
            var message = await _reelService.ToggleLikeAsync(GetCurrentUserId(), id);
            return Ok(new { success = true, message });
        } catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }
}