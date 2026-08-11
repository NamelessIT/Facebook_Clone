using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FacebookClone.Infrastructure.Configurations;

public class LiveSessionConfiguration : IEntityTypeConfiguration<LiveSession>
{
    public void Configure(EntityTypeBuilder<LiveSession> builder)
    {
        builder.ToTable("LiveSessions");
        builder.HasKey(x => x.Id);
        builder.HasIndex(x => new { x.OwnerId, x.Status });
        builder.HasIndex(x => x.OwnerId)
            .IsUnique()
            .HasFilter("\"Status\" = 1");
        builder.HasIndex(x => x.RecordingExpiresAt);
        builder.HasIndex(x => new { x.IsEvidenceOnHold, x.EvidenceExpiresAt });
        builder.Property(x => x.Title).IsRequired().HasMaxLength(180);
        builder.Property(x => x.Description).HasMaxLength(2000);
        builder.Property(x => x.EndReason).HasMaxLength(500);
        builder.Property(x => x.RecordingUrl).HasMaxLength(1000);
        builder.Property(x => x.Privacy).IsRequired();
        builder.Property(x => x.Status).IsRequired();

        builder.HasOne(x => x.Owner)
            .WithMany(x => x.LiveSessions)
            .HasForeignKey(x => x.OwnerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.ConvertedPost)
            .WithMany()
            .HasForeignKey(x => x.ConvertedPostId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
