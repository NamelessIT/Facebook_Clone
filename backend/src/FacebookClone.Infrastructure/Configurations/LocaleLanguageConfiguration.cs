using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FacebookClone.Infrastructure.Configurations;

public class LocaleLanguageConfiguration : IEntityTypeConfiguration<LocaleLanguage>
{
    public void Configure(EntityTypeBuilder<LocaleLanguage> builder)
    {
        builder.ToTable("LocaleLanguages");
        builder.HasKey(x => x.Id);
        builder.HasIndex(x => x.Code).IsUnique();
        builder.Property(x => x.Code).IsRequired().HasMaxLength(16);
        builder.Property(x => x.DisplayName).IsRequired().HasMaxLength(80);
        builder.Property(x => x.NativeName).IsRequired().HasMaxLength(80);
    }
}
