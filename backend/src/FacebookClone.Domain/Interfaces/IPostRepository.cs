using FacebookClone.Domain.Entities;

namespace FacebookClone.Domain.Interfaces;

public interface IPostRepository
{
    Task<Post> CreateAsync(Post post);
    Task<IEnumerable<Post>> GetNewsFeedAsync(int pageNumber, int pageSize);
    Task<Post?> GetByIdAsync(Guid id);
    Task UpdateAsync(Post post);
    Task<(IEnumerable<Post> Items, int Total)> SearchAsync(string query, int pageNumber, int pageSize);
}