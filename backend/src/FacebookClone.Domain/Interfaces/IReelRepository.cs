using FacebookClone.Domain.Entities;

namespace FacebookClone.Domain.Interfaces;

public interface IReelRepository
{
    Task AddReelAsync(Reel reel);
    Task<Reel?> GetByIdAsync(Guid id);
    Task UpdateAsync(Reel reel);
    Task<IEnumerable<Reel>> GetReelsFeedAsync(int pageNumber, int pageSize);
    Task<(IEnumerable<Reel> Items, int Total)> GetUserReelsAsync(Guid userId, int pageNumber, int pageSize);
    Task<ReelLike?> GetLikeAsync(Guid reelId, Guid userId);
    Task AddLikeAsync(ReelLike like);
    Task RemoveLikeAsync(ReelLike like);
    Task<int> CountLikesAsync(Guid reelId);
    Task<IEnumerable<ReelComment>> GetCommentsAsync(Guid reelId, int pageNumber, int pageSize);
    Task<ReelComment?> GetCommentAsync(Guid reelId, Guid commentId);
    Task<int> CountCommentsAsync(Guid reelId);
    Task AddCommentAsync(ReelComment comment);
}
