namespace FacebookClone.Domain.Entities;

public class ReelComment
{
    public Guid Id { get; set; }
    public Guid ReelId { get; set; }
    public Reel Reel { get; set; } = null!;
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsDeleted { get; set; }
}
