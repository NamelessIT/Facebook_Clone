using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FacebookClone.Infrastructure.Configurations;

public class PostConfiguration : IEntityTypeConfiguration<Post>
{
    public void Configure(EntityTypeBuilder<Post> builder)
    {
        builder.ToTable("Posts");

        builder.HasKey(x => x.Id);

        builder.HasOne(x => x.User)
               .WithMany(x => x.Posts)
               .HasForeignKey(x => x.UserId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.SharedPost)
               .WithMany()
               .HasForeignKey(x => x.SharedPostId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.Property(x => x.Privacy).IsRequired();
        builder.Property(x => x.PostType).IsRequired();

        builder.Property(x => x.IsDeleted).HasDefaultValue(false);
    }
}
