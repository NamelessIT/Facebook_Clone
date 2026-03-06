using FacebookClone.API.Hubs;
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

    public async Task SendNotificationToUserAsync(Guid userId, string message)
    {
        // Gửi tin nhắn có tên "ReceiveNotification" đến ĐÚNG cái userId đó
        await _hubContext.Clients.User(userId.ToString()).SendAsync("ReceiveNotification", message);
    }
}