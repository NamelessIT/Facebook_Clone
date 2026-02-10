using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using FacebookClone.Infrastructure; // Đảm bảo namespace đúng với AppDbContext

namespace FacebookClone.Infrastructure.Seed;

public class UserSeeder : ISeeder
{
    public async Task SeedAsync(AppDbContext context)
    {
        // Kiểm tra xem đã có user nào chưa
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
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                // SỬA Ở ĐÂY: Thay FullName bằng FirstName và LastName
                FirstName = "Alice",
                LastName = "Nguyen",
                Location = "Ho Chi Minh City, VN", // Thêm Location
                
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
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                // SỬA Ở ĐÂY
                FirstName = "Bob",
                LastName = "Tran",
                Location = "Ha Noi, VN",

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
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                // SỬA Ở ĐÂY
                FirstName = "Carol",
                LastName = "Pham",
                Location = "Da Nang, VN",

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
        await context.SaveChangesAsync();
    }
}