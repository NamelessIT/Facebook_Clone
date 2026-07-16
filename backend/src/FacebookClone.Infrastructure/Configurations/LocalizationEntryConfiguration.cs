using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FacebookClone.Infrastructure.Configurations;

public class LocalizationEntryConfiguration : IEntityTypeConfiguration<LocalizationEntry>
{
    public void Configure(EntityTypeBuilder<LocalizationEntry> builder)
    {
        builder.ToTable("LocalizationEntries");
        builder.HasKey(x => x.Id);
        builder.HasIndex(x => new { x.Key, x.TargetLocale }).IsUnique();
        builder.HasIndex(x => x.TargetLocale);
        builder.Property(x => x.Key).IsRequired().HasMaxLength(180);
        builder.Property(x => x.SourceLocale).IsRequired().HasMaxLength(16);
        builder.Property(x => x.TargetLocale).IsRequired().HasMaxLength(16);
        builder.Property(x => x.SourceText).IsRequired().HasMaxLength(4000);
        builder.Property(x => x.Value).IsRequired().HasMaxLength(4000);
        builder.Property(x => x.Context).HasMaxLength(240);
        builder.Property(x => x.LastError).HasMaxLength(700);

        builder.HasOne(x => x.TargetLanguage)
            .WithMany(x => x.Entries)
            .HasPrincipalKey(x => x.Code)
            .HasForeignKey(x => x.TargetLocale)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
