using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.Infrastructure.Seed;

public class UserSeeder : ISeeder
{
    public async Task SeedAsync(AppDbContext context)
    {
        if (await context.Users.AnyAsync())
            {
                Console.WriteLine("Users already seeded.");
                return;
            }
        var now = DateTime.UtcNow;

        var users = new List<User>
        {
            new User
            {
                Id = Guid.NewGuid(),
                Email = "alice@fbclone.com",
                PasswordHash = "hashed_password",
                FullName = "Alice Nguyen",
                AvatarUrl = "https://i.pravatar.cc/150?img=1",
                CoverUrl = "https://picsum.photos/800/300?1",
                Bio = "Frontend developer",
                Status = "Working 💻",
                IsOnline = true,
                CreatedAt = now,
                UpdatedAt = now
            },
            new User
            {
                Id = Guid.NewGuid(),
                Email = "bob@fbclone.com",
                PasswordHash = "hashed_password",
                FullName = "Bob Tran",
                AvatarUrl = "https://i.pravatar.cc/150?img=2",
                CoverUrl = "https://picsum.photos/800/300?2",
                Bio = "Backend developer",
                Status = "Coffee ☕",
                IsOnline = false,
                CreatedAt = now,
                UpdatedAt = now
            },
            new User
            {
                Id = Guid.NewGuid(),
                Email = "carol@fbclone.com",
                PasswordHash = "hashed_password",
                FullName = "Carol Pham",
                AvatarUrl = "https://i.pravatar.cc/150?img=3",
                CoverUrl = "https://picsum.photos/800/300?3",
                Bio = "UI/UX Designer",
                Status = "Designing 🎨",
                IsOnline = true,
                CreatedAt = now,
                UpdatedAt = now
            }
        };

        await context.Users.AddRangeAsync(users);
    }
}
