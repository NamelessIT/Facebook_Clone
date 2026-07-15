using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.Infrastructure.Seed;

public class UserSeeder : ISeeder
{
    private const string AdminEmail = "admin@fbclone.com";
    private const string AdminPassword = "Admin@123";

    public async Task SeedAsync(AppDbContext context)
    {
        var now = DateTime.UtcNow;
        var admin = await context.Users.SingleOrDefaultAsync(x => x.Email == AdminEmail);

        if (admin != null)
        {
            var changed = false;

            if (!admin.IsAdmin)
            {
                admin.IsAdmin = true;
                changed = true;
            }

            if (admin.IsBanned || admin.IsDeleted)
            {
                admin.IsBanned = false;
                admin.IsDeleted = false;
                admin.BanReason = null;
                admin.BannedAt = null;
                changed = true;
            }

            if (changed)
            {
                admin.UpdatedAt = now;
                await context.SaveChangesAsync();
                Console.WriteLine("Admin account updated.");
            }
        }

        if (await context.Users.AnyAsync())
        {
            if (admin == null)
            {
                await context.Users.AddAsync(CreateAdmin(now));
                await context.SaveChangesAsync();
                Console.WriteLine("Admin account seeded.");
            }

            Console.WriteLine("Users already seeded.");
            return;
        }

        var users = new List<User>
        {
            CreateAdmin(now),
            new User
            {
                Id = Guid.NewGuid(),
                Email = "alice@fbclone.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                FirstName = "Alice",
                LastName = "Nguyen",
                Location = "Ho Chi Minh City, VN",
                AvatarUrl = "f30955c0-791e-4e87-bd36-30b46e2eaa4d.png",
                CoverUrl = "https://picsum.photos/800/300?1",
                Bio = "Frontend developer",
                Status = "Working",
                IsOnline = true,
                CreatedAt = now,
                UpdatedAt = now
            },
            new User
            {
                Id = Guid.NewGuid(),
                Email = "bob@fbclone.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                FirstName = "Bob",
                LastName = "Tran",
                Location = "Ha Noi, VN",
                AvatarUrl = "https://i.pravatar.cc/150?img=2",
                CoverUrl = "https://picsum.photos/800/300?2",
                Bio = "Backend developer",
                Status = "Coffee",
                IsOnline = false,
                CreatedAt = now,
                UpdatedAt = now
            },
            new User
            {
                Id = Guid.NewGuid(),
                Email = "carol@fbclone.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                FirstName = "Carol",
                LastName = "Pham",
                Location = "Da Nang, VN",
                AvatarUrl = "https://i.pravatar.cc/150?img=3",
                CoverUrl = "https://picsum.photos/800/300?3",
                Bio = "UI/UX Designer",
                Status = "Designing",
                IsOnline = true,
                CreatedAt = now,
                UpdatedAt = now
            },
            new User
            {
                Id = Guid.NewGuid(),
                Email = "huy@gmail.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                FirstName = "Huy",
                LastName = "Le",
                Location = "HCM, VN",
                AvatarUrl = "103b6f49-4523-4a65-a188-b3cab9d7f626.png",
                CoverUrl = "https://picsum.photos/800/300?4",
                Bio = "Full Stack Developer",
                Status = "Coding",
                IsOnline = false,
                CreatedAt = now,
                UpdatedAt = now
            }
        };

        await context.Users.AddRangeAsync(users);
        await context.SaveChangesAsync();
    }

    private static User CreateAdmin(DateTime now)
    {
        return new User
        {
            Id = Guid.NewGuid(),
            Email = AdminEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(AdminPassword),
            FirstName = "Admin",
            LastName = "Facebook Clone",
            Location = "System",
            Bio = "System administrator",
            Status = "Managing system",
            IsAdmin = true,
            IsOnline = false,
            CreatedAt = now,
            UpdatedAt = now
        };
    }
}
