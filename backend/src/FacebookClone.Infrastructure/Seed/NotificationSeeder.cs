using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.Infrastructure.Seed;

/// <summary>
/// Seed vài thông báo mẫu (like / comment / friend request).
/// </summary>
public class NotificationSeeder : ISeeder
{
    public async Task SeedAsync(AppDbContext context)
    {
        if (await context.Notifications.AnyAsync())
        {
            Console.WriteLine("Notifications already seeded.");
            return;
        }

        var users = await context.Users.OrderBy(u => u.Email).ToListAsync();
        var posts = await context.Posts.OrderBy(p => p.CreatedAt).ToListAsync();

        if (users.Count < 2 || posts.Count < 1)
        {
            Console.WriteLine("Not enough users/posts. Skipping notification seed.");
            return;
        }

        var now = DateTime.UtcNow;
        var firstPost = posts[0];

        var notifications = new List<Notification>
        {
            // bob like post của alice
            new Notification
            {
                Id = Guid.NewGuid(),
                UserId = users[0].Id,
                ActorId = users[1].Id,
                Type = NotificationType.Like,
                ReferenceId = firstPost.Id,
                Message = $"{users[1].FullName} đã thích bài viết của bạn",
                IsRead = false,
                CreatedAt = now.AddMinutes(-25)
            },
            // bob comment post của alice
            new Notification
            {
                Id = Guid.NewGuid(),
                UserId = users[0].Id,
                ActorId = users[1].Id,
                Type = NotificationType.Comment,
                ReferenceId = firstPost.Id,
                Message = $"{users[1].FullName} đã bình luận về bài viết của bạn",
                IsRead = false,
                CreatedAt = now.AddMinutes(-30)
            }
        };

        if (users.Count >= 4)
        {
            // huy gửi lời mời kết bạn cho bob
            notifications.Add(new Notification
            {
                Id = Guid.NewGuid(),
                UserId = users[1].Id,
                ActorId = users[3].Id,
                Type = NotificationType.FriendRequest,
                ReferenceId = users[3].Id,
                Message = $"{users[3].FullName} đã gửi cho bạn lời mời kết bạn",
                IsRead = false,
                CreatedAt = now.AddDays(-1)
            });
        }

        await context.Notifications.AddRangeAsync(notifications);
        await context.SaveChangesAsync();
    }
}
