using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.Infrastructure.Repositories;

public class PostInteractionRepository : IPostInteractionRepository
{
    private readonly AppDbContext _context;

    public PostInteractionRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PostInteraction?> GetAsync(Guid userId, Guid postId, string type)
    {
        return await _context.PostInteractions
            .FirstOrDefaultAsync(x => x.UserId == userId && x.PostId == postId && x.InteractionType == type);
    }

    public async Task AddAsync(PostInteraction interaction)
    {
        _context.PostInteractions.Add(interaction);
        await _context.SaveChangesAsync();
    }

    public async Task RemoveAsync(PostInteraction interaction)
    {
        _context.PostInteractions.Remove(interaction);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> ExistsAsync(Guid userId, Guid postId, string type)
    {
        return await _context.PostInteractions
            .AnyAsync(x => x.UserId == userId && x.PostId == postId && x.InteractionType == type);
    }

    public async Task<(IEnumerable<PostInteraction> Items, int Total)> GetSavedByUserAsync(
        Guid userId, int page, int pageSize)
    {
        var query = _context.PostInteractions
            .Where(x => x.UserId == userId && x.InteractionType == PostInteractionType.SAVED)
            .OrderByDescending(x => x.CreatedAt);

        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(x => x.Post)
            .AsNoTracking()
            .ToListAsync();

        return (items, total);
    }
}
