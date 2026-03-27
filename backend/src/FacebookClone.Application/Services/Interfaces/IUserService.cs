using FacebookClone.Application.DTOs.User;

namespace FacebookClone.Application.Services.Interfaces;
public interface IUserService
{
    Task<UserProfileDto> GetProfileAsync(Guid userId);
    Task<UserProfileDto> UpdateProfileAsync(Guid userId, UpdateProfileDto request);
    Task<string> UpdateAvatarAsync(Guid userId, string avatarUrl);
    Task UpdatePrivacyAsync(Guid userId, UpdatePrivacyRequest request);
    Task UpdatePreferencesAsync(Guid userId, UpdatePreferencesRequest request);
    Task<(IEnumerable<UserProfileDto> Items, int Total)> GetAllUsersAsync(Guid currentUserId, int pageNumber, int pageSize);
}