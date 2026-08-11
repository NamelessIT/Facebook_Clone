using FacebookClone.Domain.Constants;
using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FacebookClone.Infrastructure.Configurations;

public class LiveCommentConfiguration : IEntityTypeConfiguration<LiveComment>
{
    public void Configure(EntityTypeBuilder<LiveComment> builder)
    {
        builder.ToTable("LiveComments");
        builder.HasKey(x => x.Id);
        builder.HasIndex(x => new { x.LiveSessionId, x.CreatedAt });
        builder.HasIndex(x => new { x.LiveSessionId, x.UserId, x.ClientRequestId }).IsUnique();
        builder.Property(x => x.Content).IsRequired().HasMaxLength(SharedConstants.Live.CommentMaxLength);

        builder.HasOne(x => x.LiveSession)
            .WithMany(x => x.Comments)
            .HasForeignKey(x => x.LiveSessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
