using FacebookClone.Application.DTOs.Collection;

namespace FacebookClone.Application.Services.Interfaces;

public interface ISavedCollectionService
{
    Task<IEnumerable<SavedCollectionDto>> GetUserCollectionsAsync(Guid userId);
    Task<SavedCollectionDto> CreateCollectionAsync(Guid userId, string name);
    Task DeleteCollectionAsync(Guid userId, Guid collectionId);
    Task AddPostToCollectionAsync(Guid userId, Guid collectionId, Guid postId);
    Task RemovePostFromCollectionAsync(Guid userId, Guid collectionId, Guid postId);
    Task<(IEnumerable<object> Items, int Total)> GetCollectionPostsAsync(Guid userId, Guid collectionId, int page, int pageSize);
}
