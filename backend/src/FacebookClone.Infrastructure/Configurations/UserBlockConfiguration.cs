using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FacebookClone.Infrastructure.Configurations;

public class UserBlockConfiguration : IEntityTypeConfiguration<UserBlock>
{
    public void Configure(EntityTypeBuilder<UserBlock> builder)
    {
        builder.ToTable("UserBlocks");
        builder.HasKey(x => new { x.BlockerId, x.BlockedUserId });
        builder.HasIndex(x => new { x.BlockedUserId, x.Level });
        builder.HasOne(x => x.Blocker).WithMany().HasForeignKey(x => x.BlockerId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.BlockedUser).WithMany().HasForeignKey(x => x.BlockedUserId).OnDelete(DeleteBehavior.Restrict);
    }
}
