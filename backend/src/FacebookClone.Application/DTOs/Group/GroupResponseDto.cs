using FacebookClone.Application.DTOs.User;
using FacebookClone.Domain.Enums;

namespace FacebookClone.Application.DTOs.Group;

public class GroupResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public GroupPrivacy Privacy { get; set; }
    public DateTime CreatedAt { get; set; }
    
    public int MembersCount { get; set; }
    public bool IsJoinedByMe { get; set; } // Current user đã tham gia chưa?
    
    public UserProfileDto Owner { get; set; } = null!;
}