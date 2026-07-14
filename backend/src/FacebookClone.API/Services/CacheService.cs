using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;

namespace FacebookClone.API.Services;

public interface ICacheService
{
    Task<T?> GetAsync<T>(string key, CancellationToken ct = default);
    Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken ct = default);
    Task<T> GetOrSetAsync<T>(string key, TimeSpan ttl, Func<Task<T>> factory, CancellationToken ct = default);
    Task RemoveAsync(string key, CancellationToken ct = default);
}

/// <summary>
/// Thin JSON wrapper over IDistributedCache (Redis in prod, in-memory fallback).
/// Cache failures never break the request — they log and fall through to source.
/// </summary>
public class CacheService(IDistributedCache cache, ILogger<CacheService> logger) : ICacheService
{
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
    {
        var (found, value) = await TryGetAsync<T>(key, ct);
        return found ? value : default;
    }

    // Distinguishes a real miss from a cached default(T) — important for value
    // types like int where default is 0 (a valid value).
    private async Task<(bool found, T? value)> TryGetAsync<T>(string key, CancellationToken ct)
    {
        try
        {
            var bytes = await cache.GetAsync(key, ct);
            if (bytes is null) return (false, default);
            return (true, JsonSerializer.Deserialize<T>(bytes, JsonOpts));
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Cache GET failed for {Key}", key);
            return (false, default);
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken ct = default)
    {
        try
        {
            var bytes = JsonSerializer.SerializeToUtf8Bytes(value, JsonOpts);
            await cache.SetAsync(key, bytes,
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl }, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Cache SET failed for {Key}", key);
        }
    }

    public async Task<T> GetOrSetAsync<T>(string key, TimeSpan ttl, Func<Task<T>> factory, CancellationToken ct = default)
    {
        var (found, cached) = await TryGetAsync<T>(key, ct);
        if (found)
            return cached!;

        var value = await factory();
        if (value is not null)
            await SetAsync(key, value, ttl, ct);
        return value;
    }

    public async Task RemoveAsync(string key, CancellationToken ct = default)
    {
        try { await cache.RemoveAsync(key, ct); }
        catch (Exception ex) { logger.LogWarning(ex, "Cache REMOVE failed for {Key}", key); }
    }
}
