namespace FacebookClone.Domain.Entities;

public class Reel
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string VideoUrl { get; set; } = null!;
    public string? Caption { get; set; }

    public DateTime CreatedAt { get; set; }

    public bool IsDeleted { get; set; }

    /* Navigation */
    public ICollection<ReelLike> Likes { get; set; } = new List<ReelLike>();
}
