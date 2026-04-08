using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FacebookClone.Infrastructure.Configurations;

public class SavedCollectionConfiguration : IEntityTypeConfiguration<SavedCollection>
{
    public void Configure(EntityTypeBuilder<SavedCollection> builder)
    {
        builder.ToTable("SavedCollections");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name)
               .IsRequired()
               .HasMaxLength(100);

        builder.HasOne(x => x.User)
               .WithMany()
               .HasForeignKey(x => x.UserId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(x => x.Posts)
               .WithOne(x => x.Collection)
               .HasForeignKey(x => x.CollectionId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
