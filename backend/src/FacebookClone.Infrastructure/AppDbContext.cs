using Microsoft.EntityFrameworkCore;
using FacebookClone.Domain.Entities;

namespace FacebookClone.Infrastructure;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options) { }

    // 🔥 DbSet
    public DbSet<User> Users => Set<User>();
    public DbSet<Post> Posts => Set<Post>();
    public DbSet<Reaction> Reactions { get; set; }
    public DbSet<Comment> Comments { get; set; }
    public DbSet<Friendship> Friendships { get; set; }
    public DbSet<Notification> Notifications { get; set; }
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Conversation> Conversations { get; set; }
    public DbSet<ConversationMember> ConversationMembers { get; set; }
    public DbSet<Message> Messages { get; set; }

    // (sau này seed thêm thì thêm tiếp)
    // public DbSet<Friendship> Friendships => Set<Friendship>();
    // public DbSet<Reaction> Reactions => Set<Reaction>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
