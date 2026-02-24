using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.Infrastructure.Repositories;

public class InteractionRepository : IInteractionRepository
{
    private readonly AppDbContext _context;

    public InteractionRepository(AppDbContext context)
    {
        _context = context;
    }

    /* --- REACTION --- */
    public async Task<Reaction?> GetReactionAsync(Guid userId, Guid postId)
    {
        return await _context.Reactions
            .FirstOrDefaultAsync(r => r.UserId == userId && r.PostId == postId);
    }

    public async Task AddReactionAsync(Reaction reaction) { _context.Reactions.Add(reaction); await _context.SaveChangesAsync(); }
    public async Task UpdateReactionAsync(Reaction reaction) { _context.Reactions.Update(reaction); await _context.SaveChangesAsync(); }
    public async Task DeleteReactionAsync(Reaction reaction) { _context.Reactions.Remove(reaction); await _context.SaveChangesAsync(); }

    /* --- COMMENT --- */
    public async Task AddCommentAsync(Comment comment) 
    { 
        _context.Comments.Add(comment); 
        await _context.SaveChangesAsync(); 
    }

    public async Task<IEnumerable<Comment>> GetCommentsByPostIdAsync(Guid postId, int pageNumber, int pageSize)
    {
        return await _context.Comments
            .Include(c => c.User) // Lấy thông tin người bình luận
            .Where(c => c.PostId == postId && !c.IsDeleted)
            .OrderBy(c => c.CreatedAt) // Bình luận cũ xếp trên, mới xếp dưới
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync();
    }
}