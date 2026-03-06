using FacebookClone.Application.DTOs.Chat;

namespace FacebookClone.Application.Services.Interfaces;

public interface IChatHubService
{
    Task SendMessageToUserAsync(Guid receiverId, MessageResponseDto message);
}