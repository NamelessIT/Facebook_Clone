namespace FacebookClone.Application.DTOs.Post;

public class PostInteractionResponse
{
    public Guid Id { get; set; }
    public Guid PostId { get; set; }
    public Guid UserId { get; set; }
    public string InteractionType { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
}
