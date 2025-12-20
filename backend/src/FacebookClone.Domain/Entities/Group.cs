using FacebookClone.Domain.Enums;

namespace FacebookClone.Domain.Entities;

public class Group
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;
    public string? Description { get; set; }

    public Guid OwnerId { get; set; }
    public User Owner { get; set; } = null!;

    public GroupPrivacy Privacy { get; set; }

    public DateTime CreatedAt { get; set; }

    /* Navigation */
    public ICollection<GroupMember> Members { get; set; } = new List<GroupMember>();
}
