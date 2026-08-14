using FacebookClone.API.Hubs;
using FacebookClone.Application.DTOs.Chat;
using FacebookClone.Application.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace FacebookClone.API.Services;

public class ChatHubService : IChatHubService
{
    private readonly IHubContext<ChatHub> _hubContext;

    public ChatHubService(IHubContext<ChatHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task SendMessageToUserAsync(Guid receiverId, MessageResponseDto message)
    {
        // Gửi sự kiện "ReceiveMessage" kèm theo dữ liệu tin nhắn tới đúng người nhận
        await _hubContext.Clients.User(receiverId.ToString()).SendAsync("ReceiveMessage", message);
    }

    public Task SendEventToUsersAsync(IEnumerable<Guid> userIds, string eventName, object payload)
    {
        var recipients = userIds.Distinct().Select(id => id.ToString()).ToList();
        return recipients.Count == 0
            ? Task.CompletedTask
            : _hubContext.Clients.Users(recipients).SendAsync(eventName, payload);
    }
}
