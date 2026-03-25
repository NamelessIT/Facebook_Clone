using FacebookClone.Application.DTOs.Notification;

namespace FacebookClone.Application.Services.Interfaces;

public interface INotificationHubService
{
    Task SendNotificationAsync(Guid userId, NotificationResponseDto notification);
    Task SendBadgeUpdateAsync(Guid userId, int unreadCount);
}