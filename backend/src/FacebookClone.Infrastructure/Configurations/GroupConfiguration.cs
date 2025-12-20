using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
namespace FacebookClone.Infrastructure.Configurations;
public class GroupConfiguration : IEntityTypeConfiguration<Group>
{
    public void Configure(EntityTypeBuilder<Group> builder)
    {
        builder.ToTable("Groups");

        builder.HasKey(x => x.Id);

        builder.HasOne(x => x.Owner)
               .WithMany()
               .HasForeignKey(x => x.OwnerId);

        builder.Property(x => x.Privacy).IsRequired();
    }
}