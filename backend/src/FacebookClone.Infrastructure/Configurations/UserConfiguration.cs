using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FacebookClone.Infrastructure.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");

        builder.HasKey(x => x.Id);

        builder.HasIndex(x => x.Email).IsUnique();

        builder.Property(x => x.Email).IsRequired().HasMaxLength(255);
        builder.Property(x => x.PasswordHash).IsRequired();
        // Cấu hình FirstName, LastName mới (nếu muốn kỹ hơn)
        builder.Property(x => x.FirstName).HasMaxLength(50);
        builder.Property(x => x.LastName).HasMaxLength(50);
        builder.Property(x => x.Location).HasMaxLength(100);

        builder.Ignore(x => x.FullName);

        builder.Property(x => x.IsDeleted).HasDefaultValue(false);
        builder.Property(x => x.IsOnline).HasDefaultValue(false);
    }
}
