using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FacebookClone.Application.Services.Interfaces;
using FacebookClone.Application.DTOs.User;
using System.Security.Claims;

namespace FacebookClone.API.Controllers;
[ApiController]
[Route("api/v1/users")]
[Authorize] // Yêu cầu phải có Token hợp lệ
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    // Helper để lấy ID từ Token hiện tại
    private Guid GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(idClaim)) 
            throw new UnauthorizedAccessException("Invalid Token");
        return Guid.Parse(idClaim);
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMyProfile()
    {
        var userId = GetCurrentUserId();
        var profile = await _userService.GetProfileAsync(userId);
        return Ok(profile);
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMyProfile([FromBody] UpdateProfileDto request)
    {
        var userId = GetCurrentUserId();
        var updatedProfile = await _userService.UpdateProfileAsync(userId, request);
        return Ok(updatedProfile);
    }

    // API lấy thông tin người khác (Public Profile)
    [HttpGet("{id}")]
    public async Task<IActionResult> GetUserProfile(Guid id)
    {
         var profile = await _userService.GetProfileAsync(id);
         return Ok(profile);
    }

    // API lay danh sach tat ca user (tru chinh minh), dung cho trang Friends Discovery
    [HttpGet]
    public async Task<IActionResult> GetAllUsers(
        [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 20)
    {
        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var currentUserId = GetCurrentUserId();
        var (users, total) = await _userService.GetAllUsersAsync(currentUserId, pageNumber, pageSize);

        return Ok(new
        {
            success = true,
            message = "Lay danh sach nguoi dung thanh cong.",
            data = users,
            pagination = new
            {
                page = pageNumber,
                limit = pageSize,
                total,
                totalPages = (int)Math.Ceiling((double)total / pageSize)
            }
        });
    }

    [HttpPut("me/avatar")]
    public async Task<IActionResult> UpdateAvatar([FromBody] UpdateAvatarRequest request)
    {
        try
        {
            var userId = GetCurrentUserId(); 
            var newAvatarUrl = await _userService.UpdateAvatarAsync(userId, request.AvatarUrl);
            return Ok(new { success = true, data = newAvatarUrl, message = "Cập nhật ảnh đại diện thành công!" });
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(new { success = false, message = "Token không hợp lệ" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // PUT /api/v1/users/me/privacy
    [HttpPut("me/privacy")]
    public async Task<IActionResult> UpdatePrivacy([FromBody] UpdatePrivacyRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            await _userService.UpdatePrivacyAsync(userId, request);
            return Ok(new { success = true, message = "Đã cập nhật cài đặt riêng tư." });
        }
        catch (UnauthorizedAccessException) { return Unauthorized(new { success = false, message = "Token không hợp lệ" }); }
        catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    // PUT /api/v1/users/me/preferences
    [HttpPut("me/preferences")]
    public async Task<IActionResult> UpdatePreferences([FromBody] UpdatePreferencesRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            await _userService.UpdatePreferencesAsync(userId, request);
            return Ok(new { success = true, message = "Đã cập nhật tùy chọn." });
        }
        catch (UnauthorizedAccessException) { return Unauthorized(new { success = false, message = "Token không hợp lệ" }); }
        catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }
}