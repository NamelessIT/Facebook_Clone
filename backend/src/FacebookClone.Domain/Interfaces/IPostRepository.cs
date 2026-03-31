using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;

namespace FacebookClone.Domain.Interfaces;

public interface IPostRepository
{
    Task<Post> CreateAsync(Post post);
    Task<IEnumerable<Post>> GetNewsFeedAsync(Guid currentUserId, IEnumerable<Guid> friendIds, int pageNumber, int pageSize);
    Task<Post?> GetByIdAsync(Guid id);
    Task UpdateAsync(Post post);
    Task<(IEnumerable<Post> Items, int Total)> SearchAsync(string query, int pageNumber, int pageSize);
    Task<(IEnumerable<Post> Items, int Total)> GetUserPostsAsync(Guid userId, IEnumerable<PostPrivacy> allowedPrivacies, int pageNumber, int pageSize);
}