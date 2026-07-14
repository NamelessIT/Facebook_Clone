using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FacebookClone.Infrastructure.Configurations;

public class SecurityBlockEntryConfiguration : IEntityTypeConfiguration<SecurityBlockEntry>
{
    public void Configure(EntityTypeBuilder<SecurityBlockEntry> builder)
    {
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Value)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(x => x.Reason)
            .HasMaxLength(512);

        // Fast lookup by (kind, type, value) when enforcing on each request.
        builder.HasIndex(x => new { x.ListKind, x.TargetType, x.Value });
        builder.HasIndex(x => x.IsActive);
    }
}
