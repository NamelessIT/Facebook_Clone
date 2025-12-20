using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FacebookClone.Infrastructure.Configurations;

public class MessageConfiguration : IEntityTypeConfiguration<Message>
{
    public void Configure(EntityTypeBuilder<Message> builder)
    {
        builder.ToTable("Messages");

        builder.HasKey(x => x.Id);

        builder.HasOne(x => x.Conversation)
               .WithMany(x => x.Messages)
               .HasForeignKey(x => x.ConversationId);

        builder.HasOne(x => x.Sender)
               .WithMany()
               .HasForeignKey(x => x.SenderId);

        builder.Property(x => x.MessageType).IsRequired();
        builder.Property(x => x.IsDeleted).HasDefaultValue(false);
    }
}
