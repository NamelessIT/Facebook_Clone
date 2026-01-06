namespace FacebookClone.Application.Auth.Services;
using FacebookClone.Application.Auth.DTOs;
public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
    Task<AuthResponse> RefreshTokenAsync(string refreshToken);
    Task LogoutAsync(string refreshToken);
    Task LogoutAllAsync(Guid userId);
}
