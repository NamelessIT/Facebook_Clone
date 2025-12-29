using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System;
using Microsoft.AspNetCore.Authorization;
using FacebookClone.API.Services;
using FacebookClone.Application.Auth.DTOs;  
using FacebookClone.Application.Auth.Services;
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

    // TODO: implement after JWT middleware
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        return Ok("TODO");
    }

    [HttpPost("logout-all")]
    public IActionResult LogoutAll()
    {
        return Ok("TODO");
    }

}

}