using FacebookClone.Application.DTOs.User;
using FacebookClone.Domain.Enums;

namespace FacebookClone.Application.DTOs.Notification;

public class NotificationResponseDto
{
    public Guid Id { get; set; }
    public NotificationType Type { get; set; }
    public Guid ReferenceId { get; set; } // ID của Post, Comment, hoặc Friendship
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
    
    // Ai là người tạo ra thông báo này? (VD: Alice)
    public UserProfileDto Actor { get; set; } = null!;
}