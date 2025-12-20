using FacebookClone.Domain.Enums;

namespace FacebookClone.Domain.Entities;

public class Friendship
{
    public Guid Id { get; set; }

    public Guid RequesterId { get; set; }
    public User Requester { get; set; } = null!;

    public Guid ReceiverId { get; set; }
    public User Receiver { get; set; } = null!;

    public FriendshipStatus Status { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
