using FacebookClone.Application.DTOs.User;

namespace FacebookClone.Application.Services.Interfaces;
public interface IUserService
{
    Task<UserProfileDto> GetProfileAsync(Guid userId);
    Task<UserProfileDto> UpdateProfileAsync(Guid userId, UpdateProfileDto request);
    Task<string> UpdateAvatarAsync(Guid userId, string avatarUrl);
}