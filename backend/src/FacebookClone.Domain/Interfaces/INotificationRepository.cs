using FacebookClone.Domain.Entities;

namespace FacebookClone.Domain.Interfaces;

public interface INotificationRepository
{
    Task AddNotificationAsync(Notification notification);
    Task<IEnumerable<Notification>> GetUserNotificationsAsync(Guid userId, int pageNumber, int pageSize);
    Task<Notification?> GetByIdAsync(Guid id);
    Task UpdateAsync(Notification notification);
    Task MarkAllAsReadAsync(Guid userId);
}