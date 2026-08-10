using FacebookClone.Application.DTOs.User;
using FacebookClone.Domain.Enums;

namespace FacebookClone.Application.DTOs.Reel;

public class ReelResponseDto
{
    public Guid Id { get; set; }
    public string VideoUrl { get; set; } = null!;
    public string? ThumbnailUrl { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Caption { get; set; }
    public PostPrivacy Privacy { get; set; }
    public int Duration { get; set; }
    public int ViewsCount { get; set; }
    public int LikesCount { get; set; }
    public bool IsLikedByMe { get; set; }
    public DateTime CreatedAt { get; set; }
    public UserProfileDto Author { get; set; } = null!;
}

public record ToggleLikeResultDto(bool IsLiked, int LikesCount, string Message);
