using FacebookClone.Application.DTOs.Reel;

namespace FacebookClone.Application.Services.Interfaces;

public interface IReelService
{
    Task<ReelResponseDto> CreateReelAsync(Guid userId, CreateReelRequest request);
    Task<IEnumerable<ReelResponseDto>> GetReelsFeedAsync(Guid currentUserId, int pageNumber, int pageSize);
    Task<string> ToggleLikeAsync(Guid userId, Guid reelId);
}