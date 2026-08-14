using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FacebookClone.Infrastructure.Configurations;

public class MessageHiddenForUserConfiguration : IEntityTypeConfiguration<MessageHiddenForUser>
{
    public void Configure(EntityTypeBuilder<MessageHiddenForUser> builder)
    {
        builder.ToTable("MessageHiddenForUsers");
        builder.HasKey(x => new { x.MessageId, x.UserId });

        builder.HasOne(x => x.Message)
            .WithMany(x => x.HiddenForUsers)
            .HasForeignKey(x => x.MessageId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.UserId, x.HiddenAt });
    }
}
