using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.Infrastructure.Repositories;

public class NotificationRepository : INotificationRepository
{
    private readonly AppDbContext _context;

    public NotificationRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task AddNotificationAsync(Notification notification)
    {
        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<Notification>> GetUserNotificationsAsync(Guid userId, int pageNumber, int pageSize)
    {
        return await _context.Notifications
            .Include(n => n.Actor) // Lấy thông tin người tạo thông báo
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<Notification?> GetByIdAsync(Guid id)
    {
        return await _context.Notifications.FindAsync(id);
    }

    public async Task UpdateAsync(Notification notification)
    {
        _context.Notifications.Update(notification);
        await _context.SaveChangesAsync();
    }

    public async Task MarkAllAsReadAsync(Guid userId)
    {
        var unreadNotis = await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync();

        foreach (var noti in unreadNotis)
        {
            noti.IsRead = true;
        }
        await _context.SaveChangesAsync();
    }
}