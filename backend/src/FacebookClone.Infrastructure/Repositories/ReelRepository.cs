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
            .Include(r => r.Likes) // Lấy kèm lượt like để đếm
            .Where(r => !r.IsDeleted)
            .OrderByDescending(r => r.CreatedAt) // Mới nhất lên đầu
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync();
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