using FacebookClone.Domain.Entities;

namespace FacebookClone.Domain.Interfaces;

public interface IPostInteractionRepository
{
    Task<PostInteraction?> GetAsync(Guid userId, Guid postId, string type);
    Task AddAsync(PostInteraction interaction);
    Task RemoveAsync(PostInteraction interaction);
    Task<bool> ExistsAsync(Guid userId, Guid postId, string type);
    Task<(IEnumerable<PostInteraction> Items, int Total)> GetSavedByUserAsync(Guid userId, int page, int pageSize);
}
