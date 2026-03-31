using FacebookClone.Domain.Enums;

namespace FacebookClone.Domain.Entities;

public class Reel
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string VideoUrl { get; set; } = null!;
    public string? ThumbnailUrl { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Caption { get; set; }
    public PostPrivacy Privacy { get; set; } = PostPrivacy.Public;
    public int Duration { get; set; } = 0;
    public int ViewsCount { get; set; } = 0;

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public bool IsDeleted { get; set; }

    /* Navigation */
    public ICollection<ReelLike> Likes { get; set; } = new List<ReelLike>();
}
