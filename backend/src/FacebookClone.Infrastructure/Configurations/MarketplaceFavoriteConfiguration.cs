using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FacebookClone.Infrastructure.Configurations;

public class MarketplaceFavoriteConfiguration : IEntityTypeConfiguration<MarketplaceFavorite>
{
    public void Configure(EntityTypeBuilder<MarketplaceFavorite> builder)
    {
        builder.ToTable("MarketplaceFavorites");
        builder.HasKey(x => new { x.ListingId, x.UserId });
        builder.HasOne(x => x.Listing).WithMany(x => x.Favorites)
            .HasForeignKey(x => x.ListingId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.User).WithMany()
            .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}
