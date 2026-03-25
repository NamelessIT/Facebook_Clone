using FacebookClone.Application.DTOs.User;
using FacebookClone.Domain.Enums;

namespace FacebookClone.Application.DTOs.Notification;

public class NotificationResponseDto
{
    public Guid Id { get; set; }
    public NotificationType Type { get; set; }
    public Guid ReferenceId { get; set; }
    public string? Message { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
    public UserProfileDto Actor { get; set; } = null!;
}
