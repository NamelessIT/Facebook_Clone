using System.Collections.Concurrent;
using System.Net;
using System.Text.RegularExpressions;

namespace FacebookClone.API.Services;

// -----------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------

public enum SecurityEventType
{
    RateLimitExceeded,
    IpBlocked,
    BruteForceDetected,
    SuspiciousPayload,
    AnomalousUserAgent,
    AutoBanned,
    ManualBanned,
    ManualUnbanned,
    IpManualBlocked,
    IpManualUnblocked,
}

public record SecurityEvent(
    DateTime Timestamp,
    SecurityEventType Type,
    string IpAddress,
    string Detail,
    string? Path = null
);

public record BlockedIpEntry(
    string Ip,
    DateTime BlockedAt,
    string Reason,
    bool IsAutomatic,
    DateTime? ExpiresAt = null
);

public record RateLimitEntry(
    string Ip,
    Queue<DateTime> Timestamps,
    int FailedLoginCount,
    DateTime? FailedLoginWindowStart
);

// -----------------------------------------------------------------------
// Service
// -----------------------------------------------------------------------

public interface ISecurityService
{
    // Rate limiting
    bool IsRateLimited(string ip, string path);
    void RecordFailedLogin(string ip);
    void ResetRateLimit(string ip);

    // IP blocking
    bool IsIpBlocked(string ip);
    void BlockIp(string ip, string reason, bool isAutomatic, TimeSpan? duration = null);
    void UnblockIp(string ip);
    IEnumerable<BlockedIpEntry> GetBlockedIps();

    // Events
    IEnumerable<SecurityEvent> GetRecentEvents(int count = 200);
    void RecordEvent(SecurityEventType type, string ip, string detail, string? path = null);

    // Stats
    SecurityStats GetStats();
}

public class SecurityStats
{
    public int TotalBlockedIps { get; init; }
    public int EventsLast24h { get; init; }
    public int RateLimitHitsLast1h { get; init; }
    public int BruteForceAttemptsLast1h { get; init; }
    public Dictionary<string, int> TopAttackerIps { get; init; } = new();
}

public class SecurityService : ISecurityService
{
    // Sliding-window rate limit: max requests per window per IP
    private const int MaxRequestsPerWindow = 200;
    private static readonly TimeSpan RateWindow = TimeSpan.FromMinutes(1);

    // Brute-force: max failed logins before auto-block
    private const int MaxFailedLogins = 10;
    private static readonly TimeSpan FailedLoginWindow = TimeSpan.FromMinutes(15);

    // Paths that have stricter limits (e.g. auth endpoints)
    private static readonly Dictionary<string, int> StrictPaths = new()
    {
        { "/api/v1/auth/login",        60 },
        { "/api/v1/auth/register",     30 },
        { "/api/v1/auth/refresh-token", 90 },
    };

    // Suspicious payload patterns (SQL Injection, XSS, path traversal)
    private static readonly Regex[] SuspiciousPatterns =
    [
        new(@"(\bunion\b.*\bselect\b|\bselect\b.*\bfrom\b|\bdrop\b.*\btable\b|\binsert\b.*\binto\b|\bdelete\b.*\bfrom\b|\bupdate\b.*\bset\b)",
            RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new(@"(<script[\s>]|javascript:|onerror\s*=|onload\s*=|eval\s*\()",
            RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new(@"(\.\./|\.\.\\|%2e%2e[/\\])",
            RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new(@"(exec\s*\(|system\s*\(|passthru\s*\(|shell_exec\s*\()",
            RegexOptions.IgnoreCase | RegexOptions.Compiled),
    ];

    private readonly ConcurrentDictionary<string, RateLimitEntry> _rateLimits = new();
    private readonly ConcurrentDictionary<string, BlockedIpEntry> _blockedIps = new();
    private readonly ConcurrentQueue<SecurityEvent> _events = new();
    private const int MaxEvents = 1000;

    // ---- Rate Limiting ----

    public bool IsRateLimited(string ip, string path)
    {
        if (IsIpBlocked(ip)) return true;

        var limit = StrictPaths.TryGetValue(path.ToLower(), out var strict)
            ? strict
            : MaxRequestsPerWindow;

        var entry = _rateLimits.AddOrUpdate(ip,
            _ => new RateLimitEntry(ip, new Queue<DateTime>([DateTime.UtcNow]), 0, null),
            (_, e) =>
            {
                var q = e.Timestamps;
                var cutoff = DateTime.UtcNow - RateWindow;
                while (q.Count > 0 && q.Peek() < cutoff) q.Dequeue();
                q.Enqueue(DateTime.UtcNow);
                return e with { Timestamps = q };
            });

        if (entry.Timestamps.Count > limit)
        {
            RecordEvent(SecurityEventType.RateLimitExceeded, ip,
                $"Exceeded {limit} req/min on {path}", path);

            // Auto-block after 3x the limit in 1 window
            if (entry.Timestamps.Count > limit * 3)
            {
                BlockIp(ip, $"Auto-blocked: rate limit exceeded on {path}", true, TimeSpan.FromHours(1));
                RecordEvent(SecurityEventType.AutoBanned, ip,
                    $"Auto-blocked for 1h: DoS pattern on {path}", path);
            }
            return true;
        }
        return false;
    }

    public void RecordFailedLogin(string ip)
    {
        _rateLimits.AddOrUpdate(ip,
            _ => new RateLimitEntry(ip, new Queue<DateTime>(), 1, DateTime.UtcNow),
            (_, e) =>
            {
                var windowStart = e.FailedLoginWindowStart ?? DateTime.UtcNow;
                var count = e.FailedLoginCount;

                if (DateTime.UtcNow - windowStart > FailedLoginWindow)
                {
                    count = 0;
                    windowStart = DateTime.UtcNow;
                }
                count++;

                if (count >= MaxFailedLogins)
                {
                    BlockIp(ip, $"Auto-blocked: {count} failed logins in {FailedLoginWindow.TotalMinutes}min",
                        true, TimeSpan.FromHours(2));
                    RecordEvent(SecurityEventType.BruteForceDetected, ip,
                        $"Brute-force: {count} failed logins — auto-blocked 2h");
                }

                return e with { FailedLoginCount = count, FailedLoginWindowStart = windowStart };
            });
    }

    public void ResetRateLimit(string ip) => _rateLimits.TryRemove(ip, out _);

    // ---- IP Blocking ----

    public bool IsIpBlocked(string ip)
    {
        if (!_blockedIps.TryGetValue(ip, out var entry)) return false;
        if (entry.ExpiresAt.HasValue && entry.ExpiresAt < DateTime.UtcNow)
        {
            _blockedIps.TryRemove(ip, out _);
            return false;
        }
        return true;
    }

    public void BlockIp(string ip, string reason, bool isAutomatic, TimeSpan? duration = null)
    {
        var entry = new BlockedIpEntry(ip, DateTime.UtcNow, reason, isAutomatic,
            duration.HasValue ? DateTime.UtcNow + duration : null);
        _blockedIps[ip] = entry;
    }

    public void UnblockIp(string ip)
    {
        _blockedIps.TryRemove(ip, out _);
        RecordEvent(SecurityEventType.IpManualUnblocked, ip, "IP unblocked by admin");
    }

    public IEnumerable<BlockedIpEntry> GetBlockedIps()
    {
        // Prune expired before returning
        var expired = _blockedIps
            .Where(kv => kv.Value.ExpiresAt.HasValue && kv.Value.ExpiresAt < DateTime.UtcNow)
            .Select(kv => kv.Key).ToList();
        foreach (var ip in expired) _blockedIps.TryRemove(ip, out _);

        return _blockedIps.Values.OrderByDescending(e => e.BlockedAt);
    }

    // ---- Payload Inspection ----

    public bool ContainsSuspiciousPayload(string input, out string matchedPattern)
    {
        foreach (var pattern in SuspiciousPatterns)
        {
            var m = pattern.Match(input);
            if (m.Success)
            {
                matchedPattern = m.Value;
                return true;
            }
        }
        matchedPattern = string.Empty;
        return false;
    }

    // ---- Events ----

    public void RecordEvent(SecurityEventType type, string ip, string detail, string? path = null)
    {
        _events.Enqueue(new SecurityEvent(DateTime.UtcNow, type, ip, detail, path));
        while (_events.Count > MaxEvents) _events.TryDequeue(out _);
    }

    public IEnumerable<SecurityEvent> GetRecentEvents(int count = 200)
        => _events.OrderByDescending(e => e.Timestamp).Take(count);

    // ---- Stats ----

    public SecurityStats GetStats()
    {
        var now = DateTime.UtcNow;
        var last24h = _events.Where(e => e.Timestamp > now.AddHours(-24)).ToList();
        var last1h = last24h.Where(e => e.Timestamp > now.AddHours(-1)).ToList();

        var topAttackers = last24h
            .GroupBy(e => e.IpAddress)
            .OrderByDescending(g => g.Count())
            .Take(10)
            .ToDictionary(g => g.Key, g => g.Count());

        return new SecurityStats
        {
            TotalBlockedIps = _blockedIps.Count,
            EventsLast24h = last24h.Count,
            RateLimitHitsLast1h = last1h.Count(e => e.Type == SecurityEventType.RateLimitExceeded),
            BruteForceAttemptsLast1h = last1h.Count(e => e.Type == SecurityEventType.BruteForceDetected),
            TopAttackerIps = topAttackers,
        };
    }
}
