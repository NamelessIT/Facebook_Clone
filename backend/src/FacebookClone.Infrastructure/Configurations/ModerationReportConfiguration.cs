using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FacebookClone.Infrastructure.Configurations;

public class ModerationReportConfiguration : IEntityTypeConfiguration<ModerationReport>
{
    public void Configure(EntityTypeBuilder<ModerationReport> builder)
    {
        builder.ToTable("ModerationReports");
        builder.HasKey(x => x.Id);
        builder.HasIndex(x => new { x.Status, x.CreatedAt });
        builder.HasIndex(x => new { x.Status, x.PunishmentEndsAt, x.RestoredAt });
        builder.HasIndex(x => new { x.TargetType, x.TargetId });
        builder.HasIndex(x => new { x.TargetOwnerId, x.ResolutionAction, x.PunishmentEndsAt });
        builder.HasIndex(x => new { x.ReporterId, x.TargetType, x.TargetId }).IsUnique();
        builder.Property(x => x.Reason).IsRequired().HasMaxLength(160);
        builder.Property(x => x.Details).HasMaxLength(2000);
        builder.Property(x => x.ResolutionNote).HasMaxLength(2000);
        builder.HasOne(x => x.Reporter).WithMany()
            .HasForeignKey(x => x.ReporterId).OnDelete(DeleteBehavior.Restrict);
    }
}
