using FacebookClone.Domain.Entities;
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

    // Lấy bảng tin: Sắp xếp mới nhất, lấy luôn thông tin User (Include)
    public async Task<IEnumerable<Post>> GetNewsFeedAsync(int pageNumber = 1, int pageSize = 10)
    {
        return await _context.Posts
            .Include(p => p.User) // Bắt buộc phải Include để lấy tên, avatar người đăng
            .Include(p => p.Medias) // 👈 THÊM DÒNG NÀY VÀO CHUỖI INCLUDE
            .Include(p => p.Reactions)
            .Include(p => p.Comments)
            .Where(p => !p.IsDeleted)
            .OrderByDescending(p => p.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking() // Tối ưu hóa vì ta chỉ đọc
            .ToListAsync();
    }

    public async Task<Post?> GetByIdAsync(Guid id)
    {
        return await _context.Posts
            .Include(p => p.User) // Kéo theo User để không bị lỗi Author = null
            .Include(p => p.Medias) // 👈 THÊM DÒNG NÀY VÀO CHUỖI INCLUDE
            .Include(p => p.Reactions)
            .Include(p => p.Comments)
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);
    }

    public async Task UpdateAsync(Post post)
    {
        _context.Posts.Update(post);
        await _context.SaveChangesAsync();
    }
}   