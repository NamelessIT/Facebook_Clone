using FacebookClone.Domain.Entities;

namespace FacebookClone.Domain.Interfaces;

public interface IChatRepository
{
    Task<Conversation?> GetPrivateConversationAsync(Guid userId1, Guid userId2);
    Task<Conversation?> GetConversationByIdAsync(Guid conversationId);
    Task CreateConversationAsync(Conversation conversation);
    Task AddMessageAsync(Message message);
    Task<(IEnumerable<Message> Items, int Total)> GetMessagesAsync(Guid conversationId, Guid userId, int pageNumber, int pageSize);
    Task<Message?> GetMessageForActionAsync(Guid messageId);
    Task<Message?> GetLatestVisibleMessageAsync(Guid conversationId);
    Task<IReadOnlyList<Guid>> GetConversationMemberIdsAsync(Guid conversationId);
    Task HideMessageForUserAsync(Guid messageId, Guid userId);
    Task UpdateMessageAsync(Message message);
    Task ReplaceMessageAsync(Message original, Message replacement);
    Task<IEnumerable<Conversation>> GetConversationListAsync(Guid userId);
    Task<int> GetUnreadCountAsync(Guid conversationId, Guid userId);
    Task MarkConversationAsReadAsync(Guid conversationId, Guid currentUserId);
    Task UpdateLastMessageAtAsync(Guid conversationId, DateTime lastMessageAt);
}
