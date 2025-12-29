namespace FacebookClone.API.Services;

using FacebookClone.Infrastructure;
using FacebookClone.Application.Auth.Jwt;
using FacebookClone.Application.Auth.DTOs;
using FacebookClone.Application.Auth.Services;
using Microsoft.EntityFrameworkCore;
using FacebookClone.Domain.Entities;
using BCrypt.Net;
public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly IJwtTokenGenerator _jwt;

    public AuthService(AppDbContext context, IJwtTokenGenerator jwt)
    {
        _context = context;
        _jwt = jwt;
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var user = await _context.Users
            .SingleOrDefaultAsync(x => x.Email == request.Email && !x.IsDeleted);

        if (user == null)
            throw new Exception("Invalid credentials");

        if (!BCrypt.Verify(request.Password, user.PasswordHash))
            throw new Exception("Invalid credentials");


        using var tx = await _context.Database.BeginTransactionAsync();

        var accessToken = _jwt.GenerateAccessToken(user);
        var refreshToken = _jwt.GenerateRefreshToken();

        _context.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = refreshToken,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        });

        await _context.SaveChangesAsync();
        await tx.CommitAsync();

        return new AuthResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresIn = 900
        };
    }

    // Register / Refresh / Logout sẽ làm tiếp
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        throw new NotImplementedException();
    }

    public async Task<AuthResponse> RefreshTokenAsync(string refreshToken)
    {
        using var tx = await _context.Database.BeginTransactionAsync();

        var storedToken = await _context.RefreshTokens
            .Include(x => x.User)
            .SingleOrDefaultAsync(x => x.Token == refreshToken);

        if (storedToken == null)
            throw new Exception("Invalid refresh token");

        if (storedToken.IsRevoked)
            throw new Exception("Refresh token has been revoked");

        if (storedToken.ExpiresAt < DateTime.UtcNow)
            throw new Exception("Refresh token has expired");

        var user = storedToken.User;

        if (user.IsDeleted)
            throw new Exception("User not found");

        // 🔥 Revoke old refresh token
        storedToken.IsRevoked = true;
        storedToken.RevokedAt = DateTime.UtcNow;

        // 🔥 Generate new tokens
        var newAccessToken = _jwt.GenerateAccessToken(user);
        var newRefreshToken = _jwt.GenerateRefreshToken();

        var newRefreshTokenEntity = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = newRefreshToken,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            IsRevoked = false
        };

        _context.RefreshTokens.Add(newRefreshTokenEntity);

        await _context.SaveChangesAsync();
        await tx.CommitAsync();

        return new AuthResponse
        {
            AccessToken = newAccessToken,
            RefreshToken = newRefreshToken,
            ExpiresIn = 900
        };
    }


    public async Task LogoutAsync(string refreshToken)
    {
        throw new NotImplementedException();
    }

}
