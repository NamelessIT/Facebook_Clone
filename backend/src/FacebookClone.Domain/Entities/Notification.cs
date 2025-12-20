using FacebookClone.Domain.Enums;

namespace FacebookClone.Domain.Entities;

public class Notification
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public NotificationType Type { get; set; }

    public Guid ReferenceId { get; set; }

    public bool IsRead { get; set; }

    public DateTime CreatedAt { get; set; }

    public Guid ActorId { get; set; }
    public User Actor { get; set; } = null!;
}
