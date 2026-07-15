using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.Infrastructure.Repositories;

public class PostRepository : IPostRepository
{
    private readonly AppDbContext _context;

    public PostRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Post> CreateAsync(Post post)
    {
        await _context.Posts.AddAsync(post);
        await _context.SaveChangesAsync();
        return post;
    }

    public async Task<IEnumerable<Post>> GetNewsFeedAsync(Guid currentUserId, IEnumerable<Guid> friendIds, int pageNumber = 1, int pageSize = 10)
    {
        var friendIdList = friendIds.ToList();

        return await _context.Posts
            .Include(p => p.User) 
            .Include(p => p.Medias) 
            .Include(p => p.Reactions)
                .ThenInclude(r => r.User)
            .Include(p => p.Comments)
            .Include(p => p.SharedPost!).ThenInclude(sp => sp.User)
            .Include(p => p.SharedPost!).ThenInclude(sp => sp.Medias)
            .Include(p => p.SharedPost!).ThenInclude(sp => sp.Reactions).ThenInclude(r => r.User)
            .Include(p => p.SharedPost!).ThenInclude(sp => sp.Comments)
            .Where(p => !p.IsDeleted && (
                p.Privacy == PostPrivacy.Public ||
                p.UserId == currentUserId ||
                (p.Privacy == PostPrivacy.Friends && friendIdList.Contains(p.UserId))
            ))
            .OrderByDescending(p => p.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking() 
            .ToListAsync();
    }

    public async Task<Post?> GetByIdAsync(Guid id)
    {
        return await _context.Posts
            .Include(p => p.User)
            .Include(p => p.Medias)
            .Include(p => p.Reactions)
                .ThenInclude(r => r.User)
            .Include(p => p.Comments)
            .Include(p => p.SharedPost!).ThenInclude(sp => sp.User)
            .Include(p => p.SharedPost!).ThenInclude(sp => sp.Medias)
            .Include(p => p.SharedPost!).ThenInclude(sp => sp.Reactions).ThenInclude(r => r.User)
            .Include(p => p.SharedPost!).ThenInclude(sp => sp.Comments)
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);
    }

    public async Task UpdateAsync(Post post)
    {
        _context.Posts.Update(post);
        await _context.SaveChangesAsync();
    }

    public async Task<(IEnumerable<Post> Items, int Total)> SearchAsync(string query, int pageNumber, int pageSize)
    {
        var normalizedQuery = query.ToLower().Trim();
        var baseQuery = _context.Posts
            .Include(p => p.User)
            .Include(p => p.Medias)
            .Include(p => p.Reactions)
            .Include(p => p.Comments)
            .Where(p => !p.IsDeleted &&
                p.Privacy == FacebookClone.Domain.Enums.PostPrivacy.Public &&
                p.Content.ToLower().Contains(normalizedQuery));

        var total = await baseQuery.CountAsync();
        var items = await baseQuery
            .OrderByDescending(p => p.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync();

        return (items, total);
    }

    public async Task<(IEnumerable<Post> Items, int Total)> GetUserPostsAsync(
        Guid userId, IEnumerable<PostPrivacy> allowedPrivacies, int pageNumber, int pageSize)
    {
        var privacyList = allowedPrivacies.ToList();
        var baseQuery = _context.Posts
            .Include(p => p.User)
            .Include(p => p.Medias)
            .Include(p => p.Reactions)
                .ThenInclude(r => r.User)
            .Include(p => p.Comments)
            .Include(p => p.SharedPost!).ThenInclude(sp => sp.User)
            .Include(p => p.SharedPost!).ThenInclude(sp => sp.Medias)
            .Include(p => p.SharedPost!).ThenInclude(sp => sp.Reactions).ThenInclude(r => r.User)
            .Include(p => p.SharedPost!).ThenInclude(sp => sp.Comments)
            .Where(p => !p.IsDeleted && p.UserId == userId && privacyList.Contains(p.Privacy));

        var total = await baseQuery.CountAsync();
        var items = await baseQuery
            .OrderByDescending(p => p.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync();

        return (items, total);
    }
}
