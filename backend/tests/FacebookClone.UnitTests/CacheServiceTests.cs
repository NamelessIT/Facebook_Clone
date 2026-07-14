using FacebookClone.API.Services;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace FacebookClone.UnitTests;

public class CacheServiceTests
{
    private static CacheService NewCache()
    {
        IDistributedCache dc = new MemoryDistributedCache(
            Options.Create(new MemoryDistributedCacheOptions()));
        return new CacheService(dc, NullLogger<CacheService>.Instance);
    }

    [Fact]
    public async Task GetOrSet_int_calls_factory_once_then_serves_cache()
    {
        var cache = NewCache();
        var calls = 0;
        Func<Task<int>> factory = () => { calls++; return Task.FromResult(2); };

        var first = await cache.GetOrSetAsync("k", TimeSpan.FromMinutes(1), factory);
        var second = await cache.GetOrSetAsync("k", TimeSpan.FromMinutes(1), factory);

        Assert.Equal(2, first);
        Assert.Equal(2, second);
        Assert.Equal(1, calls); // factory not called again — regression guard for the int miss bug
    }

    [Fact]
    public async Task GetOrSet_caches_zero_as_a_real_value()
    {
        var cache = NewCache();
        var calls = 0;
        Func<Task<int>> factory = () => { calls++; return Task.FromResult(0); };

        var a = await cache.GetOrSetAsync("z", TimeSpan.FromMinutes(1), factory);
        var b = await cache.GetOrSetAsync("z", TimeSpan.FromMinutes(1), factory);

        Assert.Equal(0, a);
        Assert.Equal(0, b);
        Assert.Equal(1, calls); // 0 must be treated as cached, not as a miss
    }

    [Fact]
    public async Task Remove_invalidates()
    {
        var cache = NewCache();
        var calls = 0;
        Func<Task<int>> factory = () => { calls++; return Task.FromResult(5); };

        await cache.GetOrSetAsync("r", TimeSpan.FromMinutes(1), factory);
        await cache.RemoveAsync("r");
        await cache.GetOrSetAsync("r", TimeSpan.FromMinutes(1), factory);

        Assert.Equal(2, calls); // factory re-invoked after invalidation
    }
}
