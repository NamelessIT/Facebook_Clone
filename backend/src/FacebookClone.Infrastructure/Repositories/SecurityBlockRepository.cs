using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.Infrastructure.Repositories;

public class SecurityBlockRepository(AppDbContext db) : ISecurityBlockRepository
{
    public async Task<List<SecurityBlockEntry>> GetActiveAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        return await db.SecurityBlockEntries
            .AsNoTracking()
            .Where(x => x.IsActive && (x.ExpiresAt == null || x.ExpiresAt > now))
            .ToListAsync(ct);
    }

    public async Task<List<SecurityBlockEntry>> GetAllAsync(BlockListKind? kind = null, CancellationToken ct = default)
    {
        var query = db.SecurityBlockEntries.AsNoTracking().AsQueryable();
        if (kind is not null)
            query = query.Where(x => x.ListKind == kind);
        return await query.OrderByDescending(x => x.CreatedAt).ToListAsync(ct);
    }

    public Task<SecurityBlockEntry?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.SecurityBlockEntries.FirstOrDefaultAsync(x => x.Id == id, ct);

    public async Task AddAsync(SecurityBlockEntry entry, CancellationToken ct = default)
    {
        await db.SecurityBlockEntries.AddAsync(entry, ct);
        await db.SaveChangesAsync(ct);
    }

    public async Task<bool> DeactivateAsync(Guid id, CancellationToken ct = default)
    {
        var entry = await db.SecurityBlockEntries.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entry is null || !entry.IsActive)
            return false;

        entry.IsActive = false;
        entry.RemovedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return true;
    }
}
