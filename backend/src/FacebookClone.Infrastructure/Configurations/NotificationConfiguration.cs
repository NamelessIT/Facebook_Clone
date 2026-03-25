using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FacebookClone.Infrastructure.Configurations;

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.ToTable("Notifications");

        builder.HasKey(x => x.Id);

        builder.HasOne(x => x.User)
               .WithMany()
               .HasForeignKey(x => x.UserId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Actor)
               .WithMany()
               .HasForeignKey(x => x.ActorId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.Property(x => x.Type).IsRequired();
        builder.Property(x => x.Message).HasMaxLength(500);
        builder.Property(x => x.IsRead).HasDefaultValue(false);
        builder.Property(x => x.IsDeleted).HasDefaultValue(false);

        builder.HasIndex(x => new { x.UserId, x.CreatedAt });
        builder.HasIndex(x => new { x.UserId, x.IsRead });
        builder.HasIndex(x => x.ActorId);
    }
}