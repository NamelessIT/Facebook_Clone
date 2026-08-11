using FacebookClone.Application.DTOs.Reel;
using FacebookClone.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FacebookClone.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.API.Controllers;

[Route("api/v1/[controller]")]
[ApiController]
[Authorize]
public class ReelsController : ControllerBase
{
    private readonly IReelService _reelService;
    private readonly AppDbContext _db;

    public ReelsController(IReelService reelService, AppDbContext db)
    {
        _reelService = reelService;
        _db = db;
    }

    private Guid GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(idClaim!);
    }

    [HttpPost]
    [DisableRequestSizeLimit]
    [RequestFormLimits(ValueLengthLimit = int.MaxValue, MultipartBodyLengthLimit = int.MaxValue)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> CreateReel([FromForm] CreateReelRequest request)
    {
        var userId = GetCurrentUserId();
        var suspension = await _db.Users.AsNoTracking().Where(x => x.Id == userId)
            .Select(x => new { x.IsReelSuspended, x.ReelSuspensionReason }).FirstOrDefaultAsync();
        if (suspension?.IsReelSuspended == true)
            return StatusCode(StatusCodes.Status423Locked, new { success = false, message = suspension.ReelSuspensionReason ?? "Quyền đăng Reel đang bị tạm khóa." });
        try
        {
            var reel = await _reelService.CreateReelAsync(userId, request);
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
            var result = await _reelService.ToggleLikeAsync(GetCurrentUserId(), id);
            return Ok(new { success = true, isLiked = result.IsLiked, likesCount = result.LikesCount, message = result.Message });
        }
        catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }
}
