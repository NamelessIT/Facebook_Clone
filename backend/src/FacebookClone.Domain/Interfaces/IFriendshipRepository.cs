using FacebookClone.Domain.Entities;

namespace FacebookClone.Domain.Interfaces;

public interface IFriendshipRepository
{
    Task<Friendship?> GetFriendshipAsync(Guid userId1, Guid userId2);
    Task AddFriendshipAsync(Friendship friendship);
    Task UpdateFriendshipAsync(Friendship friendship);
    Task RemoveFriendshipAsync(Friendship friendship);
    Task<IEnumerable<Friendship>> GetFriendsListAsync(Guid userId);
    Task<IEnumerable<Friendship>> GetPendingRequestsAsync(Guid userId);
}