using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FacebookClone.Infrastructure.Configurations;

public class MarketplaceListingConfiguration : IEntityTypeConfiguration<MarketplaceListing>
{
    public void Configure(EntityTypeBuilder<MarketplaceListing> builder)
    {
        builder.ToTable("MarketplaceListings");
        builder.HasKey(x => x.Id);
        builder.HasIndex(x => new { x.Status, x.CreatedAt });
        builder.HasIndex(x => new { x.SellerId, x.Status });
        builder.Property(x => x.Title).IsRequired().HasMaxLength(160);
        builder.Property(x => x.Description).IsRequired().HasMaxLength(3000);
        builder.Property(x => x.Price).HasPrecision(18, 2);
        builder.Property(x => x.DisplayFee).HasPrecision(18, 2);
        builder.HasIndex(x => x.PaymentTransactionId).IsUnique();
        builder.Property(x => x.Currency).IsRequired().HasMaxLength(8);
        builder.Property(x => x.Category).IsRequired().HasMaxLength(80);
        builder.Property(x => x.Condition).IsRequired().HasMaxLength(80);
        builder.Property(x => x.Location).IsRequired().HasMaxLength(160);
        builder.Property(x => x.ImageUrl).IsRequired().HasMaxLength(1000);
        builder.Property(x => x.TermsVersion).IsRequired().HasMaxLength(32);
        builder.Property(x => x.ModerationNote).HasMaxLength(1000);
        builder.HasOne(x => x.Seller).WithMany(x => x.MarketplaceListings)
            .HasForeignKey(x => x.SellerId).OnDelete(DeleteBehavior.Restrict);
    }
}
