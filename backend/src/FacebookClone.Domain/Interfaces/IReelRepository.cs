using FacebookClone.Domain.Entities;

namespace FacebookClone.Domain.Interfaces;

public interface IReelRepository
{
    Task AddReelAsync(Reel reel);
    Task<Reel?> GetByIdAsync(Guid id);
    
    // Lấy danh sách Reels lướt (mới nhất)
    Task<IEnumerable<Reel>> GetReelsFeedAsync(int pageNumber, int pageSize);
    
    // Các hàm cho Like
    Task<ReelLike?> GetLikeAsync(Guid reelId, Guid userId);
    Task AddLikeAsync(ReelLike like);
    Task RemoveLikeAsync(ReelLike like);
    Task<int> CountLikesAsync(Guid reelId);
}