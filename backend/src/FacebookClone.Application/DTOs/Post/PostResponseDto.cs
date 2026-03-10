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
    
    public UserProfileDto Author { get; set; } = null!;
    
    public int ReactionsCount { get; set; }
    public int CommentsCount { get; set; }

    // 👇 THÊM DÒNG NÀY ĐỂ TRẢ VỀ DANH SÁCH FILE ĐÍNH KÈM
    public List<MediaDto> Medias { get; set; } = new List<MediaDto>();
}