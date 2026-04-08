using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.Infrastructure.Repositories;

public class SavedCollectionRepository : ISavedCollectionRepository
{
    private readonly AppDbContext _context;

    public SavedCollectionRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<SavedCollection>> GetByUserAsync(Guid userId)
    {
        return await _context.SavedCollections
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .Include(x => x.Posts)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<SavedCollection?> GetByIdAsync(Guid id)
    {
        return await _context.SavedCollections
            .Include(x => x.Posts)
            .FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task AddAsync(SavedCollection collection)
    {
        _context.SavedCollections.Add(collection);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(SavedCollection collection)
    {
        _context.SavedCollections.Update(collection);
        await _context.SaveChangesAsync();
    }

    public async Task RemoveAsync(SavedCollection collection)
    {
        _context.SavedCollections.Remove(collection);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> ExistsAsync(Guid userId, string name)
    {
        return await _context.SavedCollections
            .AnyAsync(x => x.UserId == userId && x.Name == name);
    }

    public async Task AddPostAsync(SavedCollectionPost item)
    {
        _context.SavedCollectionPosts.Add(item);
        await _context.SaveChangesAsync();
    }

    public async Task RemovePostAsync(Guid collectionId, Guid postId)
    {
        var item = await _context.SavedCollectionPosts
            .FirstOrDefaultAsync(x => x.CollectionId == collectionId && x.PostId == postId);
        if (item != null)
        {
            _context.SavedCollectionPosts.Remove(item);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<bool> PostExistsInCollectionAsync(Guid collectionId, Guid postId)
    {
        return await _context.SavedCollectionPosts
            .AnyAsync(x => x.CollectionId == collectionId && x.PostId == postId);
    }

    public async Task<(IEnumerable<SavedCollectionPost> Items, int Total)> GetPostsAsync(
        Guid collectionId, int page, int pageSize)
    {
        var query = _context.SavedCollectionPosts
            .Where(x => x.CollectionId == collectionId)
            .OrderByDescending(x => x.CreatedAt);

        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(x => x.Post)
            .ThenInclude(p => p.User)
            .Include(x => x.Post)
            .ThenInclude(p => p.Medias)
            .AsNoTracking()
            .ToListAsync();

        return (items, total);
    }
}
