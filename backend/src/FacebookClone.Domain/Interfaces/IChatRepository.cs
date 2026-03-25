using FacebookClone.Domain.Entities;

namespace FacebookClone.Domain.Interfaces;

public interface IChatRepository
{
    Task<Conversation?> GetPrivateConversationAsync(Guid userId1, Guid userId2);
    Task<Conversation?> GetConversationByIdAsync(Guid conversationId);
    Task CreateConversationAsync(Conversation conversation);
    Task AddMessageAsync(Message message);
    Task<(IEnumerable<Message> Items, int Total)> GetMessagesAsync(Guid conversationId, int pageNumber, int pageSize);
    Task<IEnumerable<Conversation>> GetConversationListAsync(Guid userId);
    Task<int> GetUnreadCountAsync(Guid conversationId, Guid userId);
    Task MarkConversationAsReadAsync(Guid conversationId, Guid currentUserId);
    Task UpdateLastMessageAtAsync(Guid conversationId, DateTime lastMessageAt);
}
