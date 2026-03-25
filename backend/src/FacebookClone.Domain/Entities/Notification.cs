using FacebookClone.Domain.Enums;

namespace FacebookClone.Domain.Entities;

public class Notification
{
    public Guid Id { get; set; }

    // Người nhận thông báo
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    // Người tạo hành động (like, comment, send request...)
    public Guid ActorId { get; set; }
    public User Actor { get; set; } = null!;

    public NotificationType Type { get; set; }

    // ID của bài viết, comment, hoặc friendship liên quan
    public Guid ReferenceId { get; set; }

    // Nội dung hiển thị (VD: "Alice đã thích bài viết của bạn")
    public string? Message { get; set; }

    public bool IsRead { get; set; } = false;

    public bool IsDeleted { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
