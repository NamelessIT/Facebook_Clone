using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _context;

    public UserRepository(AppDbContext context)
    {
        _context = context;
    }
    public async Task<User?> GetByIdAsync(Guid id)
    {
        return await _context.Users.FindAsync(id);
    }
    public async Task<User?> GetByEmailAsync(string email)
    {
        return await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
    }
    public async Task AddAsync(User user)
    {
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
    }
    public async Task UpdateAsync(User user)
    {
        _context.Users.Update(user);
        await _context.SaveChangesAsync();
    }

    public async Task<(IEnumerable<User> Items, int Total)> SearchAsync(string query, int pageNumber, int pageSize)
    {
        var normalizedQuery = query.ToLower().Trim();
        var baseQuery = _context.Users
            .Where(u => !u.IsDeleted &&
                (u.FirstName.ToLower().Contains(normalizedQuery) ||
                 u.LastName.ToLower().Contains(normalizedQuery) ||
                 (u.FirstName + " " + u.LastName).ToLower().Contains(normalizedQuery)));

        var total = await baseQuery.CountAsync();
        var items = await baseQuery
            .OrderBy(u => u.FirstName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync();

        return (items, total);
    }
}