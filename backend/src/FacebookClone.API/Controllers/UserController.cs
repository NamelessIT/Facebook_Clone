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

    [HttpPut("me/avatar")]
    public async Task<IActionResult> UpdateAvatar([FromBody] UpdateAvatarRequest request)
    {
        try
        {
            // 👇 GỌI TRỰC TIẾP HÀM HELPER, KHÔNG CÓ CHỮ "User." Ở TRƯỚC
            var userId = GetCurrentUserId(); 
            
            var newAvatarUrl = await _userService.UpdateAvatarAsync(userId, request.AvatarUrl);
            return Ok(new { success = true, data = newAvatarUrl, message = "Cập nhật ảnh đại diện thành công!" });
        }
        catch (UnauthorizedAccessException)
        {
            // Bắt lỗi nếu GetCurrentUserId() quăng ra Invalid Token
            return Unauthorized(new { success = false, message = "Token không hợp lệ" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}