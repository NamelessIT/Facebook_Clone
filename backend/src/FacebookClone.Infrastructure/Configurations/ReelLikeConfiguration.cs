using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
namespace FacebookClone.Infrastructure.Configurations;
public class ReelLikeConfiguration : IEntityTypeConfiguration<ReelLike>
{
    public void Configure(EntityTypeBuilder<ReelLike> builder)
    {
        builder.ToTable("ReelLikes");

        builder.HasKey(x => new { x.ReelId, x.UserId });
    }
}