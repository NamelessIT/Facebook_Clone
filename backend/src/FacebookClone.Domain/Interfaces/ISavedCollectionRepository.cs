using FacebookClone.Domain.Entities;

namespace FacebookClone.Domain.Interfaces;

public interface ISavedCollectionRepository
{
    Task<IEnumerable<SavedCollection>> GetByUserAsync(Guid userId);
    Task<SavedCollection?> GetByIdAsync(Guid id);
    Task AddAsync(SavedCollection collection);
    Task UpdateAsync(SavedCollection collection);
    Task RemoveAsync(SavedCollection collection);
    Task<bool> ExistsAsync(Guid userId, string name);
    Task AddPostAsync(SavedCollectionPost item);
    Task RemovePostAsync(Guid collectionId, Guid postId);
    Task<bool> PostExistsInCollectionAsync(Guid collectionId, Guid postId);
    Task<(IEnumerable<SavedCollectionPost> Items, int Total)> GetPostsAsync(Guid collectionId, int page, int pageSize);
}
