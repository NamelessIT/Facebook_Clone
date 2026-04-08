namespace FacebookClone.Application.DTOs.Collection;

public class SavedCollectionDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public int PostCount { get; set; }
    public DateTime CreatedAt { get; set; }
}
