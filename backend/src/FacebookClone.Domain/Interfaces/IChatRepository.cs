using FacebookClone.Domain.Entities;

namespace FacebookClone.Domain.Interfaces;

public interface IChatRepository
{
    // Tìm phòng chat riêng (Private) giữa 2 người
    Task<Conversation?> GetPrivateConversationAsync(Guid userId1, Guid userId2);
    
    // Lấy thông tin 1 phòng chat theo ID (kèm theo danh sách thành viên)
    Task<Conversation?> GetConversationByIdAsync(Guid conversationId);
    
    // Tạo phòng chat mới
    Task CreateConversationAsync(Conversation conversation);
    
    // Lưu tin nhắn
    Task AddMessageAsync(Message message);
    
    // Lấy lịch sử tin nhắn của 1 phòng
    Task<IEnumerable<Message>> GetMessagesAsync(Guid conversationId, int pageNumber, int pageSize);
}