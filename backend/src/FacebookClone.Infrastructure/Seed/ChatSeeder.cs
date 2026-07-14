using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.Infrastructure.Seed;

/// <summary>
/// Seed 1 cuộc trò chuyện riêng tư giữa 2 user đầu tiên + vài tin nhắn.
/// </summary>
public class ChatSeeder : ISeeder
{
    public async Task SeedAsync(AppDbContext context)
    {
        if (await context.Conversations.AnyAsync())
        {
            Console.WriteLine("Conversations already seeded.");
            return;
        }

        var users = await context.Users.OrderBy(u => u.Email).ToListAsync();
        if (users.Count < 2)
        {
            Console.WriteLine("Not enough users. Skipping chat seed.");
            return;
        }

        var now = DateTime.UtcNow;

        var conversation = new Conversation
        {
            Id = Guid.NewGuid(),
            Type = ConversationType.Private,
            CreatedBy = users[0].Id,
            CreatedAt = now.AddMinutes(-60),
            LastMessageAt = now.AddMinutes(-2)
        };

        await context.Conversations.AddAsync(conversation);

        var members = new List<ConversationMember>
        {
            new ConversationMember
            {
                ConversationId = conversation.Id,
                UserId = users[0].Id,
                JoinedAt = now.AddMinutes(-60)
            },
            new ConversationMember
            {
                ConversationId = conversation.Id,
                UserId = users[1].Id,
                JoinedAt = now.AddMinutes(-60)
            }
        };
        await context.ConversationMembers.AddRangeAsync(members);

        var messages = new List<Message>
        {
            new Message
            {
                Id = Guid.NewGuid(),
                ConversationId = conversation.Id,
                SenderId = users[0].Id,
                Content = "Chào bạn, khỏe không? 👋",
                MessageType = MessageType.Text,
                IsRead = true,
                CreatedAt = now.AddMinutes(-5)
            },
            new Message
            {
                Id = Guid.NewGuid(),
                ConversationId = conversation.Id,
                SenderId = users[1].Id,
                Content = "Mình khỏe, cảm ơn bạn! Còn bạn thì sao? 😊",
                MessageType = MessageType.Text,
                IsRead = false,
                CreatedAt = now.AddMinutes(-2)
            }
        };
        await context.Messages.AddRangeAsync(messages);

        await context.SaveChangesAsync();
    }
}
