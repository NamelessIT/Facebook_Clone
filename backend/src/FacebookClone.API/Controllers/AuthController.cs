using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System;
using Microsoft.AspNetCore.Authorization;
using FacebookClone.API.Services;
using FacebookClone.Application.Auth.DTOs;  
using FacebookClone.Application.Auth.Services;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
namespace FacebookClone.API.Controllers
{
[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth)
    {
        _auth = auth;
    }

    private Guid GetUserId()
    {
        return Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
    }


    [HttpPost("login")]
    public async Task<ApiResponse<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        var result = await _auth.LoginAsync(request);
        return ApiResponse<AuthResponse>.Ok(result);
    }

    [HttpPost("refresh-token")]
    public async Task<ApiResponse<AuthResponse>> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        var result = await _auth.RefreshTokenAsync(request.RefreshToken);
        return ApiResponse<AuthResponse>.Ok(result);
    }


    [HttpPost("register")]
    public async Task<ApiResponse<AuthResponse>> Register([FromBody] RegisterRequest request)
    {
        var result = await _auth.RegisterAsync(request);
        return ApiResponse<AuthResponse>.Ok(result);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<ApiResponse<bool>> Logout([FromBody] RefreshTokenRequest request)
    {
        await _auth.LogoutAsync(request.RefreshToken);
        return ApiResponse<bool>.Ok(true, "Logged out");
    }

    [Authorize]
    [HttpPost("logout-all")]
    public async Task<ApiResponse<bool>> LogoutAll()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await _auth.LogoutAllAsync(userId);
        return ApiResponse<bool>.Ok(true, "Logged out from all devices");
    }


}

}