namespace FacebookClone.Domain.Entities;

public class ReelLike
{
    public Guid ReelId { get; set; }
    public Reel Reel { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public DateTime CreatedAt { get; set; }
}
