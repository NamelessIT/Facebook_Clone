using FacebookClone.Application.DTOs.Friendship;

namespace FacebookClone.Application.Services.Interfaces;

public interface IFriendshipService
{
    Task<string> SendFriendRequestAsync(Guid currentUserId, Guid receiverId);
    Task<string> RespondToRequestAsync(Guid currentUserId, Guid requesterId, bool isAccepted);
    Task<string> UnfriendAsync(Guid currentUserId, Guid friendId);
    Task<IEnumerable<FriendResponseDto>> GetFriendsAsync(Guid userId);
    Task<IEnumerable<FriendResponseDto>> GetPendingRequestsAsync(Guid userId);
    Task<(IEnumerable<FriendResponseDto> Items, int Total)> GetUserFriendsAsync(Guid viewerId, Guid targetUserId, int pageNumber, int pageSize);
    Task<string> GetFriendshipStatusAsync(Guid currentUserId, Guid targetUserId);
}