using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FacebookClone.Application.Services.Interfaces;
using FacebookClone.Application.DTOs.User;
using FacebookClone.Infrastructure;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using FacebookClone.Domain.Constants;

namespace FacebookClone.API.Controllers;
[ApiController]
[Route("api/v1/users")]
[Authorize] // Yêu cầu phải có Token hợp lệ
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IFileService _fileService;
    private readonly AppDbContext _db;

    public UsersController(IUserService userService, IFileService fileService, AppDbContext db)
    {
        _userService = userService;
        _fileService = fileService;
        _db = db;
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

    [HttpPost("me/heartbeat")]
    public async Task<IActionResult> Heartbeat()
    {
        var userId = GetCurrentUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null || user.IsDeleted)
            return Unauthorized(new { success = false, message = "Token khong hop le" });

        var now = DateTime.UtcNow;
        user.IsOnline = true;
        user.UpdatedAt = now;
        await _db.SaveChangesAsync();

        return Ok(new { success = true, data = new { isOnline = true, lastActiveAt = now } });
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMyProfile([FromBody] UpdateProfileDto request)
    {
        var userId = GetCurrentUserId();
        var updatedProfile = await _userService.UpdateProfileAsync(userId, request);
        return Ok(updatedProfile);
    }

    [HttpPut("me/password")]
    public async Task<IActionResult> ChangeMyPassword([FromBody] ChangePasswordRequest request)
    {
        var userId = GetCurrentUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null || user.IsDeleted)
            return Unauthorized(new { success = false, message = "Invalid token." });
        if (string.IsNullOrWhiteSpace(request.CurrentPassword) ||
            !BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            return BadRequest(new { success = false, message = "Current password is incorrect." });
        if (string.IsNullOrWhiteSpace(request.NewPassword) ||
            request.NewPassword.Length < SharedConstants.Limits.PasswordMinLength ||
            !request.NewPassword.Any(char.IsUpper) ||
            !request.NewPassword.Any(char.IsLower) ||
            !request.NewPassword.Any(char.IsDigit))
        {
            return BadRequest(new
            {
                success = false,
                message = "New password must be at least 8 characters and include uppercase, lowercase and a number."
            });
        }
        if (BCrypt.Net.BCrypt.Verify(request.NewPassword, user.PasswordHash))
            return BadRequest(new { success = false, message = "New password must be different from the current password." });

        var now = DateTime.UtcNow;
        await using var transaction = await _db.Database.BeginTransactionAsync(HttpContext.RequestAborted);
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.UpdatedAt = now;

        var activeTokens = await _db.RefreshTokens
            .Where(token => token.UserId == userId && !token.IsRevoked)
            .ToListAsync(HttpContext.RequestAborted);
        foreach (var token in activeTokens)
        {
            token.IsRevoked = true;
            token.RevokedAt = now;
        }

        await _db.SaveChangesAsync(HttpContext.RequestAborted);
        await transaction.CommitAsync(HttpContext.RequestAborted);
        return Ok(new { success = true, message = "Password changed. Please sign in again." });
    }

    [HttpPut("profile")]
    [DisableRequestSizeLimit]
    [RequestFormLimits(ValueLengthLimit = int.MaxValue, MultipartBodyLengthLimit = int.MaxValue)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UpdateMyProfileForm([FromForm] UpdateProfileFormRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var updateDto = new UpdateProfileDto
            {
                FirstName = request.FirstName,
                LastName = request.LastName,
                Bio = request.Bio,
                Location = request.Location
            };

            if (request.Avatar != null)
            {
                updateDto.AvatarUrl = await _fileService.UploadImageAsync(request.Avatar, "avatars");
            }

            if (request.Cover != null)
            {
                updateDto.CoverUrl = await _fileService.UploadImageAsync(request.Cover, "covers");
            }

            var updatedProfile = await _userService.UpdateProfileAsync(userId, updateDto);
            return Ok(new { success = true, message = "Cap nhat trang ca nhan thanh cong.", data = updatedProfile });
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(new { success = false, message = "Token khong hop le" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("cover")]
    [DisableRequestSizeLimit]
    [RequestFormLimits(ValueLengthLimit = int.MaxValue, MultipartBodyLengthLimit = int.MaxValue)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UpdateCoverPhoto(IFormFile cover)
    {
        try
        {
            if (cover == null || cover.Length == 0)
                return BadRequest(new { success = false, message = "Vui long chon anh bia." });

            var userId = GetCurrentUserId();
            var coverUrl = await _fileService.UploadImageAsync(cover, "covers");
            var updatedProfile = await _userService.UpdateProfileAsync(userId, new UpdateProfileDto { CoverUrl = coverUrl });

            return Ok(new { success = true, message = "Cap nhat anh bia thanh cong.", data = updatedProfile });
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(new { success = false, message = "Token khong hop le" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
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

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
