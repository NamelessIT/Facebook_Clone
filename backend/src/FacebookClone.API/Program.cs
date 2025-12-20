using Microsoft.EntityFrameworkCore;
using FacebookClone.Infrastructure;
using FacebookClone.Infrastructure.Seed;

var builder = WebApplication.CreateBuilder(args);

// 🔥 Local connection string (seed + dev)
var connectionString = builder.Configuration.GetConnectionString("Default");


builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddControllers();
var app = builder.Build();

// 🔥 Seed command
if (args.Contains("--seed"))
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    await SeedRunner.RunAsync(dbContext);
    return;
}

app.MapControllers();
app.Run();
