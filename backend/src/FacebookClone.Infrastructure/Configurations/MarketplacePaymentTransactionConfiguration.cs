using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FacebookClone.Infrastructure.Configurations;

public class MarketplacePaymentTransactionConfiguration : IEntityTypeConfiguration<MarketplacePaymentTransaction>
{
    public void Configure(EntityTypeBuilder<MarketplacePaymentTransaction> builder)
    {
        builder.ToTable("MarketplacePaymentTransactions");
        builder.HasKey(x => x.Id);
        builder.HasIndex(x => x.ReferenceCode).IsUnique();
        builder.HasIndex(x => new { x.UserId, x.Status, x.CreatedAt });
        builder.Property(x => x.Amount).HasPrecision(18, 2);
        builder.Property(x => x.Currency).IsRequired().HasMaxLength(8);
        builder.Property(x => x.ReferenceCode).IsRequired().HasMaxLength(32);
        builder.Property(x => x.FailureReason).HasMaxLength(1000);
        builder.HasOne(x => x.User).WithMany()
            .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Listing).WithOne(x => x.PaymentTransaction)
            .HasForeignKey<MarketplaceListing>(x => x.PaymentTransactionId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
