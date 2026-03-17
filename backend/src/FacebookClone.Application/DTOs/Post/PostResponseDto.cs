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

    public int? MyReaction { get; set; }
    public List<int> TopReactions { get; set; } = new List<int>();
    public List<string> ReactorNames { get; set; } = new List<string>();
    // 👇 THÊM DÒNG NÀY ĐỂ TRẢ VỀ DANH SÁCH FILE ĐÍNH KÈM
    public List<MediaDto> Medias { get; set; } = new List<MediaDto>();
}