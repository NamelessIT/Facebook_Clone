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
}