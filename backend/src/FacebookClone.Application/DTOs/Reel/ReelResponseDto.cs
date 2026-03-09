using FacebookClone.Application.DTOs.User;

namespace FacebookClone.Application.DTOs.Reel;

public class ReelResponseDto
{
    public Guid Id { get; set; }
    public string VideoUrl { get; set; } = null!;
    public string? Caption { get; set; }
    public DateTime CreatedAt { get; set; }
    
    // Số lượng tim
    public int LikesCount { get; set; }
    // Trạng thái: Mình đã thả tim reel này chưa?
    public bool IsLikedByMe { get; set; }

    public UserProfileDto Author { get; set; } = null!;
}