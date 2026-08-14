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
        builder.Property(x => x.IsRecalled).HasDefaultValue(false);
        builder.Property(x => x.IsPinned).HasDefaultValue(false);
        builder.Property(x => x.IsRead).HasDefaultValue(false);

        builder.HasOne(x => x.ReplyToMessage)
               .WithMany()
               .HasForeignKey(x => x.ReplyToMessageId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.ForwardedFromMessage)
               .WithMany()
               .HasForeignKey(x => x.ForwardedFromMessageId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.ReplacesMessage)
               .WithMany()
               .HasForeignKey(x => x.ReplacesMessageId)
               .OnDelete(DeleteBehavior.Restrict);

        // Index để tăng tốc query lịch sử chat theo conversation
        builder.HasIndex(x => new { x.ConversationId, x.CreatedAt });
        // Index để query unread messages nhanh
        builder.HasIndex(x => new { x.ConversationId, x.IsRead, x.SenderId });
        builder.HasIndex(x => new { x.ConversationId, x.IsPinned });
    }
}
