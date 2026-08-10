using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.Infrastructure.Seed;

public class UserSeeder : ISeeder
{
    private const string AdminEmail = "admin@fbclone.com";
    private const string AdminPassword = "Admin@123";
    private const string TestPassword = "123456";
    private const int GeneratedUserCount = 46;

    public async Task SeedAsync(AppDbContext context)
    {
        var now = DateTime.UtcNow;
        var admin = await context.Users.SingleOrDefaultAsync(x => x.Email == AdminEmail);

        if (admin == null)
        {
            await context.Users.AddAsync(CreateAdmin(now));
            Console.WriteLine("Admin account seeded.");
        }
        else
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
                Console.WriteLine("Admin account updated.");
            }
        }

        var existingEmails = await context.Users
            .Select(user => user.Email)
            .ToHashSetAsync(StringComparer.OrdinalIgnoreCase);
        var testPasswordHash = BCrypt.Net.BCrypt.HashPassword(TestPassword);
        var usersToAdd = CreateCoreUsers(now, testPasswordHash)
            .Concat(CreateGeneratedUsers(now, testPasswordHash))
            .Where(user => !existingEmails.Contains(user.Email))
            .ToList();

        if (usersToAdd.Count > 0)
        {
            await context.Users.AddRangeAsync(usersToAdd);
            Console.WriteLine($"Seeded {usersToAdd.Count} missing test users.");
        }
        else
        {
            Console.WriteLine("Test users already seeded.");
        }

        await context.SaveChangesAsync();
    }

    private static IEnumerable<User> CreateCoreUsers(DateTime now, string passwordHash)
    {
        yield return CreateUser("alice@fbclone.com", "Alice", "Nguyen", "Ho Chi Minh City, VN", "Frontend developer", "Working", "f30955c0-791e-4e87-bd36-30b46e2eaa4d.png", 1, now, passwordHash, true);
        yield return CreateUser("bob@fbclone.com", "Bob", "Tran", "Ha Noi, VN", "Backend developer", "Coffee", "https://i.pravatar.cc/150?img=2", 2, now, passwordHash, false);
        yield return CreateUser("carol@fbclone.com", "Carol", "Pham", "Da Nang, VN", "UI/UX Designer", "Designing", "https://i.pravatar.cc/150?img=3", 3, now, passwordHash, true);
        yield return CreateUser("huy@gmail.com", "Huy", "Le", "Ho Chi Minh City, VN", "Full Stack Developer", "Coding", "103b6f49-4523-4a65-a188-b3cab9d7f626.png", 4, now, passwordHash, false);
    }

    private static IEnumerable<User> CreateGeneratedUsers(DateTime now, string passwordHash)
    {
        string[] firstNames = ["An", "Binh", "Chi", "Dung", "Giang", "Ha", "Khanh", "Lan", "Minh", "Nam", "Phuong", "Quang", "Trang", "Vy"];
        string[] lastNames = ["Nguyen", "Tran", "Le", "Pham", "Hoang", "Vo", "Dang", "Bui"];
        string[] locations = ["Ho Chi Minh City, VN", "Ha Noi, VN", "Da Nang, VN", "Can Tho, VN", "Hue, VN", "Nha Trang, VN"];
        string[] bios = ["Software engineer", "Content creator", "Product designer", "Photographer", "Digital marketer", "University student", "Small business owner"];

        for (var index = 1; index <= GeneratedUserCount; index++)
        {
            var firstName = firstNames[(index - 1) % firstNames.Length];
            var lastName = lastNames[(index * 3) % lastNames.Length];
            var createdAt = now.AddYears(-2).AddDays(-(index * 11));
            yield return CreateUser(
                $"tester{index:00}@fbclone.com",
                firstName,
                $"{lastName} {index:00}",
                locations[(index - 1) % locations.Length],
                bios[(index - 1) % bios.Length],
                index % 3 == 0 ? "Available" : "Exploring Facebook Clone",
                $"https://i.pravatar.cc/150?img={4 + (index % 66)}",
                10 + index,
                createdAt,
                passwordHash,
                index % 4 == 0);
        }
    }

    private static User CreateUser(
        string email,
        string firstName,
        string lastName,
        string location,
        string bio,
        string status,
        string avatarUrl,
        int coverSeed,
        DateTime createdAt,
        string passwordHash,
        bool isOnline)
    {
        return new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = passwordHash,
            FirstName = firstName,
            LastName = lastName,
            Location = location,
            AvatarUrl = avatarUrl,
            CoverUrl = $"https://picsum.photos/seed/fb-cover-{coverSeed}/1200/420",
            Bio = bio,
            Status = status,
            IsOnline = isOnline,
            CreatedAt = createdAt,
            UpdatedAt = createdAt,
            IsDeleted = false
        };
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
