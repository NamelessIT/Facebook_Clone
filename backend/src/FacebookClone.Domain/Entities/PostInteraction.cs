using FacebookClone.Domain.Enums;

namespace FacebookClone.Domain.Entities;

public class PostInteraction
{
    public Guid Id { get; set; }
    public Guid PostId { get; set; }
    public Guid UserId { get; set; }
    public string InteractionType { get; set; } = null!;
    public string? ReportReason { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public Post Post { get; set; } = null!;
}
