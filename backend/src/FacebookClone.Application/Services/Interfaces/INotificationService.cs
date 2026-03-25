using FacebookClone.Application.DTOs.Notification;
using FacebookClone.Domain.Enums;

namespace FacebookClone.Application.Services.Interfaces;

public interface INotificationService
{
    // Tao notification (goi tu cac service khac sau khi thuc hien action)
    Task CreateNotificationAsync(Guid userId, Guid actorId, NotificationType type, Guid referenceId, string? message = null);

    // Cac method cho Controller (frontend goi)
    Task<(IEnumerable<NotificationResponseDto> Items, int Total)> GetMyNotificationsAsync(Guid userId, int pageNumber = 1, int pageSize = 10);
    Task<int> GetUnreadCountAsync(Guid userId);
    Task<bool> MarkAsReadAsync(Guid userId, Guid notificationId);
    Task<bool> MarkAllAsReadAsync(Guid userId);
    Task<bool> DeleteNotificationAsync(Guid userId, Guid notificationId);
}
