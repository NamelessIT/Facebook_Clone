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
    Task<MessageMutationResponseDto> EditMessageAsync(Guid currentUserId, Guid messageId, EditMessageRequest request);
    Task<MessageMutationResponseDto> RecallMessageAsync(Guid currentUserId, Guid messageId);
    Task<MessageMutationResponseDto> SetMessagePinnedAsync(Guid currentUserId, Guid messageId, bool isPinned);
    Task HideMessageAsync(Guid currentUserId, Guid messageId);
    Task<MessageResponseDto> ForwardMessageAsync(Guid currentUserId, Guid messageId, ForwardMessageRequest request);
}
