using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FacebookClone.Infrastructure.Configurations;

public class ReactionConfiguration : IEntityTypeConfiguration<Reaction>
{
    public void Configure(EntityTypeBuilder<Reaction> builder)
    {
        builder.ToTable("Reactions");

        builder.HasKey(x => x.Id);

        builder.HasIndex(x => new { x.UserId, x.PostId }).IsUnique();

        builder.HasOne(x => x.User)
               .WithMany()
               .HasForeignKey(x => x.UserId);

        builder.HasOne(x => x.Post)
               .WithMany(x => x.Reactions)
               .HasForeignKey(x => x.PostId);

        builder.Property(x => x.ReactionType).IsRequired();
    }
}
