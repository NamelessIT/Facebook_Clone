namespace FacebookClone.Domain.Entities;

public class UserBlock
{
    public Guid BlockerId { get; set; }
    public User Blocker { get; set; } = null!;
    public Guid BlockedUserId { get; set; }
    public User BlockedUser { get; set; } = null!;
    // 1: only messages; 2: full isolation (content, live, messages, notifications)
    public int Level { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
