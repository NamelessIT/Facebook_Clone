using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FacebookClone.Infrastructure.Configurations;

public class ModerationReportEvidenceConfiguration : IEntityTypeConfiguration<ModerationReportEvidence>
{
    public void Configure(EntityTypeBuilder<ModerationReportEvidence> builder)
    {
        builder.ToTable("ModerationReportEvidence");
        builder.HasKey(x => x.Id);
        builder.HasIndex(x => x.ModerationReportId);
        builder.Property(x => x.FileUrl).IsRequired().HasMaxLength(1000);
        builder.Property(x => x.OriginalFileName).IsRequired().HasMaxLength(255);
        builder.Property(x => x.ContentType).IsRequired().HasMaxLength(120);
        builder.HasOne(x => x.ModerationReport).WithMany(x => x.Evidence)
            .HasForeignKey(x => x.ModerationReportId).OnDelete(DeleteBehavior.Cascade);
    }
}
