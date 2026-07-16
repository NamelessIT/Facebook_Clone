using Microsoft.EntityFrameworkCore;

namespace FacebookClone.Infrastructure.Seed;

public static class SeedRunner
{
public static async Task RunAsync(AppDbContext context)
{
    using var transaction = await context.Database.BeginTransactionAsync();

    try
    {
        Console.WriteLine("Seeding data...");

        // Thứ tự quan trọng: User → Post → (Friendship, Interaction, Chat, Notification)
        // vì các seeder sau tham chiếu tới User/Post đã được lưu.
        var seeders = new ISeeder[]
        {
            new UserSeeder(),
            new LocalizationSeeder(),
            new RbacSeeder(),
            new PostSeeder(),
            new FriendshipSeeder(),
            new InteractionSeeder(),
            new ChatSeeder(),
            new NotificationSeeder()
        };

        foreach (var seeder in seeders)
        {
            await seeder.SeedAsync(context);
        }

        await context.SaveChangesAsync();
        await transaction.CommitAsync();

        Console.WriteLine("Seed completed successfully.");
    }
    catch
    {
        await transaction.RollbackAsync();
        throw;
    }
}

}
