using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.Infrastructure.Repositories;

public class FriendshipRepository : IFriendshipRepository
{
    private readonly AppDbContext _context;

    public FriendshipRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Friendship?> GetFriendshipAsync(Guid userId1, Guid userId2)
    {
        return await _context.Friendships
            .FirstOrDefaultAsync(f => 
                (f.RequesterId == userId1 && f.ReceiverId == userId2) ||
                (f.RequesterId == userId2 && f.ReceiverId == userId1));
    }

    public async Task AddFriendshipAsync(Friendship friendship)
    {
        _context.Friendships.Add(friendship);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateFriendshipAsync(Friendship friendship)
    {
        _context.Friendships.Update(friendship);
        await _context.SaveChangesAsync();
    }

    public async Task RemoveFriendshipAsync(Friendship friendship)
    {
        _context.Friendships.Remove(friendship);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<Friendship>> GetFriendsListAsync(Guid userId)
    {
        // Lấy danh sách bạn bè (Status = Accepted)
        return await _context.Friendships
            .Include(f => f.Requester)
            .Include(f => f.Receiver)
            .Where(f => (f.RequesterId == userId || f.ReceiverId == userId) && f.Status == FriendshipStatus.Accepted)
            .ToListAsync();
    }

    public async Task<(IEnumerable<Friendship> Items, int Total)> GetFriendsListPagedAsync(
        Guid userId, int pageNumber, int pageSize)
    {
        var baseQuery = _context.Friendships
            .Include(f => f.Requester)
            .Include(f => f.Receiver)
            .Where(f => (f.RequesterId == userId || f.ReceiverId == userId)
                        && f.Status == FriendshipStatus.Accepted);

        var total = await baseQuery.CountAsync();
        var items = await baseQuery
            .OrderByDescending(f => f.UpdatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync();

        return (items, total);
    }

    public async Task<IEnumerable<Friendship>> GetPendingRequestsAsync(Guid userId)
    {
        // Lấy danh sách ai đó gửi cho mình (Status = Pending)
        return await _context.Friendships
            .Include(f => f.Requester)
            .Where(f => f.ReceiverId == userId && f.Status == FriendshipStatus.Pending)
            .ToListAsync();
    }
}