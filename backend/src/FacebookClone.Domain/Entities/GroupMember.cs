using FacebookClone.Domain.Enums;

namespace FacebookClone.Domain.Entities;

public class GroupMember
{
    public Guid GroupId { get; set; }
    public Group Group { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public GroupRole Role { get; set; }

    public DateTime JoinedAt { get; set; }
}
