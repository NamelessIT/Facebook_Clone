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
    public DbSet<Reel> Reels { get; set; }
    public DbSet<ReelLike> ReelLikes { get; set; } 
    public DbSet<Group> Groups { get; set; }
    public DbSet<GroupMember> GroupMembers { get; set; }
    public DbSet<MediaAttachment> MediaAttachments { get; set; }
    public DbSet<PostInteraction> PostInteractions { get; set; }
    public DbSet<SavedCollection> SavedCollections { get; set; }
    public DbSet<SavedCollectionPost> SavedCollectionPosts { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ReelLike>().HasKey(rl => new { rl.ReelId, rl.UserId });
        modelBuilder.Entity<GroupMember>().HasKey(gm => new { gm.GroupId, gm.UserId });

        modelBuilder.Entity<PostInteraction>()
            .HasKey(pi => new { pi.PostId, pi.UserId, pi.InteractionType });

        modelBuilder.Entity<PostInteraction>()
            .HasOne(pi => pi.Post)
            .WithMany()
            .HasForeignKey(pi => pi.PostId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SavedCollectionPost>()
            .HasKey(scp => new { scp.CollectionId, scp.PostId });

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
