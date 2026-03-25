using FacebookClone.Domain.Entities;

namespace FacebookClone.Domain.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id);
    Task<User?> GetByEmailAsync(string email);
    Task AddAsync(User user);
    Task UpdateAsync(User user);
    Task<(IEnumerable<User> Items, int Total)> SearchAsync(string query, int pageNumber, int pageSize);
}