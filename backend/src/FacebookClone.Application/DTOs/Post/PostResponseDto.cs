using FacebookClone.Application.DTOs.User;
using FacebookClone.Domain.Enums;

namespace FacebookClone.Application.DTOs.Post;

public class PostResponseDto
{
    public Guid Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public PostPrivacy Privacy { get; set; }
    public PostType PostType { get; set; }
    public DateTime CreatedAt { get; set; }
    
    // Trả về thông tin người đăng (Tận dụng lại UserProfileDto hoặc tạo một AuthorDto nhỏ gọn)
    public UserProfileDto Author { get; set; } = null!;
    
    // Thống kê tương tác (Làm nền tảng cho Frontend hiển thị số like/comment)
    public int ReactionsCount { get; set; }
    public int CommentsCount { get; set; }
}