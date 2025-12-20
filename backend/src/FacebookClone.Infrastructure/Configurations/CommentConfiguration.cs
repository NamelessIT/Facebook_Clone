using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FacebookClone.Infrastructure.Configurations;

public class CommentConfiguration : IEntityTypeConfiguration<Comment>
{
    public void Configure(EntityTypeBuilder<Comment> builder)
    {
        builder.ToTable("Comments");

        builder.HasKey(x => x.Id);

        builder.HasOne(x => x.Post)
               .WithMany(x => x.Comments)
               .HasForeignKey(x => x.PostId);

        builder.HasOne(x => x.User)
               .WithMany(x => x.Comments)
               .HasForeignKey(x => x.UserId);

        builder.HasOne(x => x.ParentComment)
               .WithMany(x => x.Replies)
               .HasForeignKey(x => x.ParentCommentId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.Property(x => x.IsDeleted).HasDefaultValue(false);
    }
}
