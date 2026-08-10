using FacebookClone.Application.DTOs.Reel;

namespace FacebookClone.Application.Services.Interfaces;

public interface IReelService
{
    Task<ReelResponseDto> CreateReelAsync(Guid userId, CreateReelRequest request);
    Task<(IEnumerable<ReelResponseDto> Items, int Total)> GetReelsFeedAsync(Guid currentUserId, int pageNumber, int pageSize);
    Task<(IEnumerable<ReelResponseDto> Items, int Total)> GetUserReelsAsync(Guid currentUserId, Guid targetUserId, int pageNumber, int pageSize);
    Task<ReelResponseDto> GetReelAsync(Guid currentUserId, Guid reelId);
    Task<ReelResponseDto> UpdateReelAsync(Guid userId, Guid reelId, UpdateReelRequest request);
    Task DeleteReelAsync(Guid userId, Guid reelId);
    Task<ToggleLikeResultDto> ToggleLikeAsync(Guid userId, Guid reelId);
}