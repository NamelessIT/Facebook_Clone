using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.Infrastructure.Repositories;

public class ReelRepository : IReelRepository
{
    private readonly AppDbContext _context;

    public ReelRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task AddReelAsync(Reel reel)
    {
        _context.Reels.Add(reel);
        await _context.SaveChangesAsync();
    }

    public async Task<Reel?> GetByIdAsync(Guid id)
    {
        return await _context.Reels
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);
    }

    public async Task<IEnumerable<Reel>> GetReelsFeedAsync(int pageNumber, int pageSize)
    {
        return await _context.Reels
            .Include(r => r.User)
            .Include(r => r.Likes)
            .Where(r => !r.IsDeleted && r.Privacy == FacebookClone.Domain.Enums.PostPrivacy.Public)
            .OrderByDescending(r => r.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task UpdateAsync(Reel reel)
    {
        _context.Reels.Update(reel);
        await _context.SaveChangesAsync();
    }

    public async Task<(IEnumerable<Reel> Items, int Total)> GetUserReelsAsync(
        Guid userId, int pageNumber, int pageSize)
    {
        var baseQuery = _context.Reels
            .Include(r => r.User)
            .Include(r => r.Likes)
            .Where(r => !r.IsDeleted && r.UserId == userId);

        var total = await baseQuery.CountAsync();
        var items = await baseQuery
            .OrderByDescending(r => r.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync();

        return (items, total);
    }

    public async Task<ReelLike?> GetLikeAsync(Guid reelId, Guid userId)
    {
        return await _context.Set<ReelLike>()
            .FirstOrDefaultAsync(l => l.ReelId == reelId && l.UserId == userId);
    }

    public async Task AddLikeAsync(ReelLike like)
    {
        _context.Set<ReelLike>().Add(like);
        await _context.SaveChangesAsync();
    }

    public async Task RemoveLikeAsync(ReelLike like)
    {
        _context.Set<ReelLike>().Remove(like);
        await _context.SaveChangesAsync();
    }

    public async Task<int> CountLikesAsync(Guid reelId)
    {
        return await _context.Set<ReelLike>().CountAsync(l => l.ReelId == reelId);
    }
}