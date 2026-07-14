using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.Infrastructure.Seed;

public class PostSeeder : ISeeder
{
    public async Task SeedAsync(AppDbContext context)
    {
        if (await context.Posts.AnyAsync())
        {
            Console.WriteLine("Posts already seeded.");
            return;
        }

        var users = await context.Users.ToListAsync();

        if (users.Count < 1)
        {
            Console.WriteLine("No users found. Skipping post seed.");
            return;
        }

        var now = DateTime.UtcNow;

        var posts = new List<Post>
        {
            new Post
            {
                Id = Guid.NewGuid(),
                UserId = users[0].Id,
                Content = "Hello Facebook Clone 👋",
                Privacy = PostPrivacy.Public,
                PostType = PostType.Normal,
                CreatedAt = now,
                UpdatedAt = now
            }
        };

        // 👉 chỉ add thêm nếu đủ user
        if (users.Count >= 2)
        {
            posts.Add(new Post
            {
                Id = Guid.NewGuid(),
                UserId = users[1].Id,
                Content = "Post dành cho bạn bè 🤝",
                Privacy = PostPrivacy.Friends,
                PostType = PostType.Normal,
                CreatedAt = now,
                UpdatedAt = now
            });
        }

        if (users.Count >= 3)
        {
            posts.Add(new Post
            {
                Id = Guid.NewGuid(),
                UserId = users[2].Id,
                Content = "Learning React + .NET 🚀",
                Privacy = PostPrivacy.Public,
                PostType = PostType.Normal,
                CreatedAt = now,
                UpdatedAt = now
            });
        }

        await context.Posts.AddRangeAsync(posts);
        await context.SaveChangesAsync();
    }

}
