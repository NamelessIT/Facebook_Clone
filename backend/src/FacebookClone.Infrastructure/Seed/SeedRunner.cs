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

        var seeders = new ISeeder[]
        {
            new UserSeeder(),
            new PostSeeder()
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
