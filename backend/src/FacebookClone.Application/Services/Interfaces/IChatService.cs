using FacebookClone.Application.DTOs.Chat;

namespace FacebookClone.Application.Services.Interfaces;

public interface IChatService
{
    Task<MessageResponseDto> SendMessageAsync(Guid senderId, SendMessageRequest request);
    Task<IEnumerable<MessageResponseDto>> GetMessagesAsync(Guid conversationId, int pageNumber, int pageSize);
}