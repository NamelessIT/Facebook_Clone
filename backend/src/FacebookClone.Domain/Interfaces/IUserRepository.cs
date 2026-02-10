using FacebookClone.Domain.Entities;

namespace FacebookClone.Domain.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id);
    Task UpdateAsync(User user);
    // Thêm các method khác nếu cần
}