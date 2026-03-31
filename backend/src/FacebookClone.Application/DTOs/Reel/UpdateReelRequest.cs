using FacebookClone.Domain.Enums;

namespace FacebookClone.Application.DTOs.Reel;

public class UpdateReelRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Caption { get; set; }
    public PostPrivacy? Privacy { get; set; }
}
