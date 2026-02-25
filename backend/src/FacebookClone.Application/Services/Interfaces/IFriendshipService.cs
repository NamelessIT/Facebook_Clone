using FacebookClone.Application.DTOs.Friendship;

namespace FacebookClone.Application.Services.Interfaces;

public interface IFriendshipService
{
    Task<string> SendFriendRequestAsync(Guid currentUserId, Guid receiverId);
    Task<string> RespondToRequestAsync(Guid currentUserId, Guid requesterId, bool isAccepted);
    Task<string> UnfriendAsync(Guid currentUserId, Guid friendId);
    Task<IEnumerable<FriendResponseDto>> GetFriendsAsync(Guid userId);
    Task<IEnumerable<FriendResponseDto>> GetPendingRequestsAsync(Guid userId);
}