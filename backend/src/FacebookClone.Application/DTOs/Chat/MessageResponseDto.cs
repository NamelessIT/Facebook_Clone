using FacebookClone.Application.DTOs.User;
using FacebookClone.Domain.Enums;

namespace FacebookClone.Application.DTOs.Chat;

public class MessageResponseDto
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public string Content { get; set; } = string.Empty;
    public MessageType MessageType { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? EditedAt { get; set; }
    public bool IsEdited => EditedAt.HasValue;
    public bool IsRecalled { get; set; }
    public bool IsPinned { get; set; }
    public Guid? PinnedById { get; set; }
    public DateTime? PinnedAt { get; set; }
    public bool IsForwarded { get; set; }
    public MessageReplyPreviewDto? ReplyTo { get; set; }
    public UserProfileDto Sender { get; set; } = null!;
}

public class MessageReplyPreviewDto
{
    public Guid Id { get; set; }
    public Guid SenderId { get; set; }
    public string SenderName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public MessageType MessageType { get; set; }
    public bool IsRecalled { get; set; }
}
