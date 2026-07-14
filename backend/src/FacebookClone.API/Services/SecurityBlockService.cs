using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Interfaces;

namespace FacebookClone.API.Services;

public interface ISecurityBlockService
{
    Task<bool> IsWhitelistedAsync(string? ip, Guid? userId, string? email, CancellationToken ct = default);
    Task<SecurityBlockEntry?> MatchBlacklistAsync(string? ip, Guid? userId, string? email, CancellationToken ct = default);
    Task<SecurityBlockEntry> AddAsync(BlockListKind kind, BlockTargetType type, string value, string? reason, Guid? adminId, DateTime? expiresAt, CancellationToken ct = default);
    Task<bool> RemoveAsync(Guid id, CancellationToken ct = default);
    Task<List<SecurityBlockEntry>> ListAsync(BlockListKind? kind, CancellationToken ct = default);
}

/// <summary>
/// Enforces persistent block/allow lists. The active set is cached (Redis when
/// available) and invalidated whenever an admin adds/removes an entry.
/// </summary>
public class SecurityBlockService(
    ISecurityBlockRepository repo,
    ICacheService cache) : ISecurityBlockService
{
    private const string ActiveCacheKey = "security:blocklist:active";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

    private Task<List<SecurityBlockEntry>> GetActiveCachedAsync(CancellationToken ct) =>
        cache.GetOrSetAsync(ActiveCacheKey, CacheTtl, () => repo.GetActiveAsync(ct), ct);

    public async Task<bool> IsWhitelistedAsync(string? ip, Guid? userId, string? email, CancellationToken ct = default)
    {
        var active = await GetActiveCachedAsync(ct);
        return active.Any(e => e.ListKind == BlockListKind.Whitelist && Matches(e, ip, userId, email));
    }

    public async Task<SecurityBlockEntry?> MatchBlacklistAsync(string? ip, Guid? userId, string? email, CancellationToken ct = default)
    {
        var active = await GetActiveCachedAsync(ct);
        return active.FirstOrDefault(e => e.ListKind == BlockListKind.Blacklist && Matches(e, ip, userId, email));
    }

    public async Task<SecurityBlockEntry> AddAsync(BlockListKind kind, BlockTargetType type, string value, string? reason, Guid? adminId, DateTime? expiresAt, CancellationToken ct = default)
    {
        var entry = new SecurityBlockEntry
        {
            Id = Guid.NewGuid(),
            ListKind = kind,
            TargetType = type,
            Value = value.Trim(),
            Reason = reason,
            IsManual = true,
            IsActive = true,
            ExpiresAt = expiresAt,
            CreatedBy = adminId,
            CreatedAt = DateTime.UtcNow
        };
        await repo.AddAsync(entry, ct);
        await cache.RemoveAsync(ActiveCacheKey, ct); // invalidate
        return entry;
    }

    public async Task<bool> RemoveAsync(Guid id, CancellationToken ct = default)
    {
        var ok = await repo.DeactivateAsync(id, ct);
        if (ok) await cache.RemoveAsync(ActiveCacheKey, ct);
        return ok;
    }

    public Task<List<SecurityBlockEntry>> ListAsync(BlockListKind? kind, CancellationToken ct = default) =>
        repo.GetAllAsync(kind, ct);

    private static bool Matches(SecurityBlockEntry e, string? ip, Guid? userId, string? email) => e.TargetType switch
    {
        BlockTargetType.Ip => ip is not null && string.Equals(e.Value, ip, StringComparison.OrdinalIgnoreCase),
        BlockTargetType.User => userId is not null && string.Equals(e.Value, userId.Value.ToString(), StringComparison.OrdinalIgnoreCase),
        BlockTargetType.Email => email is not null && string.Equals(e.Value, email, StringComparison.OrdinalIgnoreCase),
        _ => false
    };
}
