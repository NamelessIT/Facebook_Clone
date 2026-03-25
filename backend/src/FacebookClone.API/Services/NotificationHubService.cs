using FacebookClone.API.Hubs;
using FacebookClone.Application.DTOs.Notification;
using FacebookClone.Application.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace FacebookClone.API.Services;

public class NotificationHubService : INotificationHubService
{
    private readonly IHubContext<NotificationHub> _hubContext;

    public NotificationHubService(IHubContext<NotificationHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task SendNotificationAsync(Guid userId, NotificationResponseDto notification)
    {
        await _hubContext.Clients.User(userId.ToString())
            .SendAsync("NewNotification", notification);
    }

    public async Task SendBadgeUpdateAsync(Guid userId, int unreadCount)
    {
        await _hubContext.Clients.User(userId.ToString())
            .SendAsync("BadgeUpdate", unreadCount);
    }
}
