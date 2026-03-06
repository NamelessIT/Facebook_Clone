using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.Infrastructure.Repositories;

public class ChatRepository : IChatRepository
{
    private readonly AppDbContext _context;

    public ChatRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Conversation?> GetPrivateConversationAsync(Guid userId1, Guid userId2)
    {
        // Tìm phòng chat Private mà cả User1 và User2 đều là thành viên
        return await _context.Conversations
            .Include(c => c.Members)
            .Where(c => c.Type == ConversationType.Private)
            .FirstOrDefaultAsync(c => 
                c.Members.Any(m => m.UserId == userId1) && 
                c.Members.Any(m => m.UserId == userId2));
    }

    public async Task<Conversation?> GetConversationByIdAsync(Guid conversationId)
    {
        return await _context.Conversations
            .Include(c => c.Members)
            .FirstOrDefaultAsync(c => c.Id == conversationId);
    }

    public async Task CreateConversationAsync(Conversation conversation)
    {
        _context.Conversations.Add(conversation);
        await _context.SaveChangesAsync();
    }

    public async Task AddMessageAsync(Message message)
    {
        _context.Messages.Add(message);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<Message>> GetMessagesAsync(Guid conversationId, int pageNumber, int pageSize)
    {
        // Lấy tin nhắn mới nhất xếp dưới cùng (Order by CreatedAt DESC xong Reverse lại trên Frontend hoặc lấy thẳng)
        // Thông thường chat thì lấy tin mới nhất trước
        return await _context.Messages
            .Include(m => m.Sender)
            .Where(m => m.ConversationId == conversationId && !m.IsDeleted)
            .OrderByDescending(m => m.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync();
    }
}