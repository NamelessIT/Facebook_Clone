using FacebookClone.Application.DTOs.User;
using FacebookClone.Domain.Enums;

namespace FacebookClone.Application.DTOs.Friendship;

public class FriendResponseDto
{
    public Guid FriendshipId { get; set; }
    public Guid UserId { get; set; } // ID của người bạn
    public UserProfileDto Profile { get; set; } = null!;
    public FriendshipStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
}