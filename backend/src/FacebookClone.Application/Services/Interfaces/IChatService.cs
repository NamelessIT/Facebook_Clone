using FacebookClone.Application.DTOs.Chat;

namespace FacebookClone.Application.Services.Interfaces;

public interface IChatService
{
    Task<MessageResponseDto> SendMessageAsync(
        Guid senderId,
        SendMessageRequest request,
        string? correlationId = null,
        bool allowNonFriendConversation = false);
    Task<(IEnumerable<MessageResponseDto> Items, int Total)> GetMessagesAsync(Guid conversationId, Guid currentUserId, int pageNumber, int pageSize);
    Task<IEnumerable<ConversationListItemDto>> GetConversationListAsync(Guid userId);
    Task MarkConversationAsReadAsync(Guid conversationId, Guid currentUserId);
    Task<bool> AreFriendsAsync(Guid userId1, Guid userId2);
}
