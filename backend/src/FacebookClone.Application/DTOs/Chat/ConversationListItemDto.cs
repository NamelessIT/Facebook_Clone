using FacebookClone.Application.DTOs.User;

namespace FacebookClone.Application.DTOs.Chat;

public class ConversationListItemDto
{
    public Guid ConversationId { get; set; }
    public int Type { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public int MemberCount { get; set; }
    public UserProfileDto OtherUser { get; set; } = null!;
    public string? LastMessageContent { get; set; }
    public DateTime? LastMessageAt { get; set; }
    public int UnreadCount { get; set; }
}
