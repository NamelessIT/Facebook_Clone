using FacebookClone.Domain.Enums;

namespace FacebookClone.Domain.Entities;

public class MediaAttachment
{
    public Guid Id { get; set; }

    // Đường dẫn trỏ tới file trong thư mục uploads/
    public string Url { get; set; } = null!;

    public MediaType MediaType { get; set; }

    // Khóa ngoại trỏ về Post (Có thể null nếu file này được đăng trong Comment)
    public Guid? PostId { get; set; }
    public Post? Post { get; set; }

    // Khóa ngoại trỏ về Comment (Có thể null nếu file này được đăng trong Post)
    public Guid? CommentId { get; set; }
    public Comment? Comment { get; set; }

    public DateTime CreatedAt { get; set; }
}