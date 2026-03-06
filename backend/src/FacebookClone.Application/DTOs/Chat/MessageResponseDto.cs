using FacebookClone.Application.DTOs.User;
using FacebookClone.Domain.Enums;

namespace FacebookClone.Application.DTOs.Chat;

public class MessageResponseDto
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public string Content { get; set; } = string.Empty;
    public MessageType MessageType { get; set; }
    public DateTime CreatedAt { get; set; }
    
    // Thông tin người gửi (Alice)
    public UserProfileDto Sender { get; set; } = null!;
}