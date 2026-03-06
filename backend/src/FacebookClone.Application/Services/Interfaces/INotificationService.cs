using FacebookClone.Application.DTOs.Notification;
using FacebookClone.Domain.Enums;

namespace FacebookClone.Application.Services.Interfaces;

public interface INotificationService
{
    // Hàm này dùng nội bộ để các Service khác gọi (VD: Thả tim xong thì gọi hàm này)
    Task CreateNotificationAsync(Guid userId, Guid actorId, NotificationType type, Guid referenceId);
    
    // Các hàm cho Controller (Dành cho Frontend gọi)
    Task<IEnumerable<NotificationResponseDto>> GetMyNotificationsAsync(Guid userId, int pageNumber = 1, int pageSize = 10);
    Task<bool> MarkAsReadAsync(Guid userId, Guid notificationId);
    Task<bool> MarkAllAsReadAsync(Guid userId);
}