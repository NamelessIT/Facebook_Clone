using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FacebookClone.Infrastructure.Configurations;

public class FriendshipConfiguration : IEntityTypeConfiguration<Friendship>
{
    public void Configure(EntityTypeBuilder<Friendship> builder)
    {
        // Gộp tên bảng và Check Constraint vào 1 dòng lệnh ToTable
        builder.ToTable("Friendships", t => 
            t.HasCheckConstraint("CK_Friendship_NoSelf", "\"RequesterId\" <> \"ReceiverId\"")
        );

        builder.HasKey(x => x.Id);

        builder.HasIndex(x => new { x.RequesterId, x.ReceiverId }).IsUnique();

        builder.Property(x => x.Status).IsRequired();

        // Cấu hình relationship (quan trọng)
        builder.HasOne(f => f.Requester)
               .WithMany(u => u.SentFriendRequests)
               .HasForeignKey(f => f.RequesterId)
               .OnDelete(DeleteBehavior.Restrict); // Tránh vòng lặp delete

        builder.HasOne(f => f.Receiver)
               .WithMany(u => u.ReceivedFriendRequests)
               .HasForeignKey(f => f.ReceiverId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}