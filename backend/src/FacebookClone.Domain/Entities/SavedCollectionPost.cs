namespace FacebookClone.Domain.Entities;

public class SavedCollectionPost
{
    public Guid CollectionId { get; set; }
    public Guid PostId { get; set; }
    public DateTime CreatedAt { get; set; }

    // Navigation
    public SavedCollection Collection { get; set; } = null!;
    public Post Post { get; set; } = null!;
}
