using FacebookClone.Domain.Enums;

namespace FacebookClone.Domain.Entities;

public class Conversation
{
    public Guid Id { get; set; }

    public ConversationType Type { get; set; }

    public Guid CreatedBy { get; set; }
    public User Creator { get; set; } = null!;

    public DateTime CreatedAt { get; set; }
    public DateTime? LastMessageAt { get; set; }

    /* Navigation */
    public ICollection<ConversationMember> Members { get; set; } = new List<ConversationMember>();
    public ICollection<Message> Messages { get; set; } = new List<Message>();
}
