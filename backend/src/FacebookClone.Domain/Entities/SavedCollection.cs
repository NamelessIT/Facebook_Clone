namespace FacebookClone.Domain.Entities;

public class SavedCollection
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public ICollection<SavedCollectionPost> Posts { get; set; } = new List<SavedCollectionPost>();
}
