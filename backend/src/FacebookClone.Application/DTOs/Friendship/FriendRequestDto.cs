using System.ComponentModel.DataAnnotations;

namespace FacebookClone.Application.DTOs.Friendship;

public class FriendRequestDto
{
    [Required]
    public Guid ReceiverId { get; set; }
}