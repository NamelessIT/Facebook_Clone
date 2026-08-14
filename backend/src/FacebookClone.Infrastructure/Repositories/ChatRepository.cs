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
        return await _context.Conversations
            .Include(c => c.Members)
            .Include(c => c.Messages.Where(m => !m.IsDeleted).OrderByDescending(m => m.CreatedAt).Take(1))
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

    public async Task<(IEnumerable<Message> Items, int Total)> GetMessagesAsync(
        Guid conversationId, Guid userId, int pageNumber, int pageSize)
    {
        var baseQuery = _context.Messages
            .Include(m => m.Sender)
            .Include(m => m.ReplyToMessage)
                .ThenInclude(m => m!.Sender)
            .Where(m => m.ConversationId == conversationId &&
                        !m.IsDeleted &&
                        !m.HiddenForUsers.Any(hidden => hidden.UserId == userId));

        var total = await baseQuery.CountAsync();
        var items = await baseQuery
            .OrderByDescending(m => m.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync();

        return (items, total);
    }

    public Task<Message?> GetMessageForActionAsync(Guid messageId) =>
        _context.Messages
            .Include(m => m.Sender)
            .Include(m => m.ReplyToMessage)
                .ThenInclude(m => m!.Sender)
            .Include(m => m.Conversation)
                .ThenInclude(c => c.Members)
            .FirstOrDefaultAsync(m => m.Id == messageId);

    public Task<Message?> GetLatestVisibleMessageAsync(Guid conversationId) =>
        _context.Messages
            .Where(m => m.ConversationId == conversationId && !m.IsDeleted)
            .OrderByDescending(m => m.CreatedAt)
            .ThenByDescending(m => m.EditedAt)
            .FirstOrDefaultAsync();

    public async Task<IReadOnlyList<Guid>> GetConversationMemberIdsAsync(Guid conversationId) =>
        await _context.ConversationMembers
            .Where(member => member.ConversationId == conversationId)
            .Select(member => member.UserId)
            .ToListAsync();

    public async Task HideMessageForUserAsync(Guid messageId, Guid userId)
    {
        var exists = await _context.MessageHiddenForUsers
            .AnyAsync(hidden => hidden.MessageId == messageId && hidden.UserId == userId);
        if (exists) return;

        _context.MessageHiddenForUsers.Add(new MessageHiddenForUser
        {
            MessageId = messageId,
            UserId = userId,
            HiddenAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();
    }

    public async Task UpdateMessageAsync(Message message)
    {
        _context.Messages.Update(message);
        await _context.SaveChangesAsync();
    }

    public async Task ReplaceMessageAsync(Message original, Message replacement)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();
        original.IsDeleted = true;
        _context.Messages.Update(original);
        _context.Messages.Add(replacement);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
    }

    public async Task<IEnumerable<Conversation>> GetConversationListAsync(Guid userId)
    {
        return await _context.Conversations
            .Include(c => c.Members)
                .ThenInclude(m => m.User)
            .Include(c => c.Messages.Where(m => !m.IsDeleted).OrderByDescending(m => m.CreatedAt).Take(1))
            .Where(c => c.Members.Any(m => m.UserId == userId))
            .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<int> GetUnreadCountAsync(Guid conversationId, Guid userId)
    {
        return await _context.Messages
            .CountAsync(m =>
                m.ConversationId == conversationId &&
                m.SenderId != userId &&
                !m.IsRead &&
                !m.IsDeleted);
    }

    public async Task MarkConversationAsReadAsync(Guid conversationId, Guid currentUserId)
    {
        await _context.Messages
            .Where(m =>
                m.ConversationId == conversationId &&
                m.SenderId != currentUserId &&
                !m.IsRead &&
                !m.IsDeleted)
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.IsRead, true));
    }

    public async Task UpdateLastMessageAtAsync(Guid conversationId, DateTime lastMessageAt)
    {
        await _context.Conversations
            .Where(c => c.Id == conversationId)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.LastMessageAt, lastMessageAt));
    }
}
