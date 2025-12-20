namespace FacebookClone.Infrastructure.Seed;

public interface ISeeder
{
    Task SeedAsync(AppDbContext context);
}
