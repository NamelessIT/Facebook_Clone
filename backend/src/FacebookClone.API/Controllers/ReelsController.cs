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
    [DisableRequestSizeLimit]
    [RequestFormLimits(ValueLengthLimit = int.MaxValue, MultipartBodyLengthLimit = int.MaxValue)]
    public async Task<IActionResult> CreateReel([FromForm] CreateReelRequest request)
    {
        try
        {
            var reel = await _reelService.CreateReelAsync(GetCurrentUserId(), request);
            return Ok(new { success = true, data = reel });
        }
        catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HttpGet("feed")]
    public async Task<IActionResult> GetReelsFeed([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        var (items, total) = await _reelService.GetReelsFeedAsync(GetCurrentUserId(), pageNumber, pageSize);
        return Ok(new
        {
            success = true,
            data = items,
            pagination = new { pageNumber, pageSize, total, totalPages = (int)Math.Ceiling((double)total / pageSize) }
        });
    }

    [HttpGet("user/{userId:guid}")]
    public async Task<IActionResult> GetUserReels(Guid userId,
        [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 12)
    {
        try
        {
            var (items, total) = await _reelService.GetUserReelsAsync(GetCurrentUserId(), userId, pageNumber, pageSize);
            return Ok(new
            {
                success = true,
                data = items,
                pagination = new { pageNumber, pageSize, total, totalPages = (int)Math.Ceiling((double)total / pageSize) }
            });
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetReel(Guid id)
    {
        try
        {
            var reel = await _reelService.GetReelAsync(GetCurrentUserId(), id);
            return Ok(new { success = true, data = reel });
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (Exception ex) { return NotFound(new { success = false, message = ex.Message }); }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateReel(Guid id, [FromBody] UpdateReelRequest request)
    {
        try
        {
            var reel = await _reelService.UpdateReelAsync(GetCurrentUserId(), id, request);
            return Ok(new { success = true, data = reel });
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteReel(Guid id)
    {
        try
        {
            await _reelService.DeleteReelAsync(GetCurrentUserId(), id);
            return Ok(new { success = true, message = "Xoa Reel thanh cong." });
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HttpPost("{id:guid}/like")]
    public async Task<IActionResult> ToggleLike(Guid id)
    {
        try
        {
            var message = await _reelService.ToggleLikeAsync(GetCurrentUserId(), id);
            return Ok(new { success = true, message });
        }
        catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }
}