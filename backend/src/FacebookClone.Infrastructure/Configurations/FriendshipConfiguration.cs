using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FacebookClone.Infrastructure.Configurations;

public class FriendshipConfiguration : IEntityTypeConfiguration<Friendship>
{
    public void Configure(EntityTypeBuilder<Friendship> builder)
    {
        builder.ToTable("Friendships");

        builder.HasKey(x => x.Id);

        builder.HasIndex(x => new { x.RequesterId, x.ReceiverId }).IsUnique();

        builder.HasCheckConstraint(
            "CK_Friendship_NoSelf",
            "\"RequesterId\" <> \"ReceiverId\""
        );

        builder.Property(x => x.Status).IsRequired();
    }
}
