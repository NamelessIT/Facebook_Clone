using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.Infrastructure.Seed;

/// <summary>
/// Seed comments + reactions cho các post đã tạo.
/// </summary>
public class InteractionSeeder : ISeeder
{
    public async Task SeedAsync(AppDbContext context)
    {
        if (await context.Comments.AnyAsync() || await context.Reactions.AnyAsync())
        {
            Console.WriteLine("Interactions already seeded.");
            return;
        }

        var users = await context.Users.OrderBy(u => u.Email).ToListAsync();
        var posts = await context.Posts.OrderBy(p => p.CreatedAt).ToListAsync();

        if (users.Count < 2 || posts.Count < 1)
        {
            Console.WriteLine("Not enough users/posts. Skipping interaction seed.");
            return;
        }

        var now = DateTime.UtcNow;

        // --- Comments ---
        var firstPost = posts[0];
        var rootComment = new Comment
        {
            Id = Guid.NewGuid(),
            PostId = firstPost.Id,
            UserId = users[1].Id,
            Content = "Chào mừng bạn đến với Facebook Clone! 🎉",
            CreatedAt = now.AddMinutes(-30)
        };

        var replyComment = new Comment
        {
            Id = Guid.NewGuid(),
            PostId = firstPost.Id,
            UserId = users[0].Id,
            ParentCommentId = rootComment.Id,
            Content = "Cảm ơn bạn nhiều nha 😄",
            CreatedAt = now.AddMinutes(-20)
        };

        var comments = new List<Comment> { rootComment, replyComment };

        if (posts.Count >= 2)
        {
            comments.Add(new Comment
            {
                Id = Guid.NewGuid(),
                PostId = posts[1].Id,
                UserId = users[0].Id,
                Content = "Bài viết hay quá 👍",
                CreatedAt = now.AddMinutes(-10)
            });
        }

        await context.Comments.AddRangeAsync(comments);

        // --- Reactions (thả cảm xúc vào post) ---
        var reactions = new List<Reaction>
        {
            new Reaction
            {
                Id = Guid.NewGuid(),
                UserId = users[1].Id,
                PostId = firstPost.Id,
                ReactionType = ReactionType.Like,
                CreatedAt = now.AddMinutes(-25)
            }
        };

        if (users.Count >= 3)
        {
            reactions.Add(new Reaction
            {
                Id = Guid.NewGuid(),
                UserId = users[2].Id,
                PostId = firstPost.Id,
                ReactionType = ReactionType.Love,
                CreatedAt = now.AddMinutes(-15)
            });
        }

        // Reaction vào comment (PostId null, CommentId set)
        reactions.Add(new Reaction
        {
            Id = Guid.NewGuid(),
            UserId = users[0].Id,
            CommentId = rootComment.Id,
            ReactionType = ReactionType.Haha,
            CreatedAt = now.AddMinutes(-5)
        });

        await context.Reactions.AddRangeAsync(reactions);
        await context.SaveChangesAsync();
    }
}
