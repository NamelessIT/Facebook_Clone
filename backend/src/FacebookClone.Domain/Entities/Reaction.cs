using FacebookClone.Domain.Enums;

namespace FacebookClone.Domain.Entities;

public class Reaction
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid PostId { get; set; }
    public Post Post { get; set; } = null!;

    public ReactionType ReactionType { get; set; }

    public DateTime CreatedAt { get; set; }
}
