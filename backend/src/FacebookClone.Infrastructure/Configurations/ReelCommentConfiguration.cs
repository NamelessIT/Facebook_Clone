using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FacebookClone.Infrastructure.Configurations;

public class ReelCommentConfiguration : IEntityTypeConfiguration<ReelComment>
{
    public void Configure(EntityTypeBuilder<ReelComment> builder)
    {
        builder.ToTable("ReelComments");
        builder.HasKey(x => x.Id);
        builder.HasIndex(x => new { x.ReelId, x.CreatedAt });
        builder.Property(x => x.Content).IsRequired().HasMaxLength(1000);
        builder.Property(x => x.IsDeleted).HasDefaultValue(false);

        builder.HasOne(x => x.Reel)
            .WithMany(x => x.Comments)
            .HasForeignKey(x => x.ReelId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.User)
            .WithMany(x => x.ReelComments)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
