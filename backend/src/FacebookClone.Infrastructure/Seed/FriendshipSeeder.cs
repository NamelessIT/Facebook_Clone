using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.Infrastructure.Seed;

public class FriendshipSeeder : ISeeder
{
    public async Task SeedAsync(AppDbContext context)
    {
        if (await context.Friendships.AnyAsync())
        {
            Console.WriteLine("Friendships already seeded.");
            return;
        }

        var users = await context.Users.OrderBy(u => u.Email).ToListAsync();
        if (users.Count < 2)
        {
            Console.WriteLine("Not enough users found. Skipping friendship seed.");
            return;
        }

        var now = DateTime.UtcNow;
        var friendships = new List<Friendship>();

        // alice <-> bob : accepted
        friendships.Add(new Friendship
        {
            Id = Guid.NewGuid(),
            RequesterId = users[0].Id,
            ReceiverId = users[1].Id,
            Status = FriendshipStatus.Accepted,
            CreatedAt = now.AddDays(-5),
            UpdatedAt = now.AddDays(-4)
        });

        if (users.Count >= 3)
        {
            // alice <-> carol : accepted
            friendships.Add(new Friendship
            {
                Id = Guid.NewGuid(),
                RequesterId = users[0].Id,
                ReceiverId = users[2].Id,
                Status = FriendshipStatus.Accepted,
                CreatedAt = now.AddDays(-3),
                UpdatedAt = now.AddDays(-3)
            });
        }

        if (users.Count >= 4)
        {
            // huy -> bob : pending request
            friendships.Add(new Friendship
            {
                Id = Guid.NewGuid(),
                RequesterId = users[3].Id,
                ReceiverId = users[1].Id,
                Status = FriendshipStatus.Pending,
                CreatedAt = now.AddDays(-1),
                UpdatedAt = now.AddDays(-1)
            });
        }

        await context.Friendships.AddRangeAsync(friendships);
        await context.SaveChangesAsync();
    }
}
