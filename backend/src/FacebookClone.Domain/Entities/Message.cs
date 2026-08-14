using FacebookClone.Domain.Enums;

namespace FacebookClone.Domain.Entities;

public class Message
{
    public Guid Id { get; set; }

    public Guid ConversationId { get; set; }
    public Conversation Conversation { get; set; } = null!;

    public Guid SenderId { get; set; }
    public User Sender { get; set; } = null!;

    public string Content { get; set; } = null!;

    public MessageType MessageType { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? EditedAt { get; set; }

    public Guid? ReplyToMessageId { get; set; }
    public Message? ReplyToMessage { get; set; }

    public Guid? ForwardedFromMessageId { get; set; }
    public Message? ForwardedFromMessage { get; set; }

    public Guid? ReplacesMessageId { get; set; }
    public Message? ReplacesMessage { get; set; }

    public bool IsRead { get; set; } = false;

    public bool IsDeleted { get; set; }

    public bool IsRecalled { get; set; }

    public bool IsPinned { get; set; }
    public Guid? PinnedById { get; set; }
    public DateTime? PinnedAt { get; set; }

    public ICollection<MessageHiddenForUser> HiddenForUsers { get; set; } = new List<MessageHiddenForUser>();
}
