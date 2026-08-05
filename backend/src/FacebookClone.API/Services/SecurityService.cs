using System.Collections.Concurrent;
using System.Net;
using System.Text.RegularExpressions;
using FacebookClone.Domain.Constants;

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

public record SuspiciousIpPath(string Path, int Requests);

public record SuspiciousIpSummary(
    string IpAddress,
    int RiskScore,
    string RiskLevel,
    DateTime FirstSeen,
    DateTime LastSeen,
    int RequestsLastMinute,
    int RequestsLastHour,
    int FailedRequestsLastHour,
    double ErrorRatePercent,
    int FailedLoginCount,
    int ThreatEventCount,
    int DistinctPathCount,
    bool IsBlocked,
    IReadOnlyList<string> Signals,
    IReadOnlyList<string> AssociatedUserIds,
    IReadOnlyList<string> AssociatedEmails,
    IReadOnlyList<SuspiciousIpPath> TopPaths
);

internal record SecurityRequestSample(DateTime Timestamp, string Path, string Method, int StatusCode);

internal sealed class IpActivityState(DateTime firstSeen)
{
    public object SyncRoot { get; } = new();
    public Queue<SecurityRequestSample> Requests { get; } = new();
    public HashSet<string> UserIds { get; } = new(StringComparer.OrdinalIgnoreCase);
    public HashSet<string> Emails { get; } = new(StringComparer.OrdinalIgnoreCase);
    public DateTime FirstSeen { get; } = firstSeen;
    public DateTime LastSeen { get; set; } = firstSeen;
    public int SuspiciousUserAgentCount { get; set; }
}

// -----------------------------------------------------------------------
// Service
// -----------------------------------------------------------------------

public interface ISecurityService
{
    // Rate limiting
    bool IsRateLimited(string ip, string path);
    void RecordFailedLogin(string ip);
    int ResetRateLimit(string ip);
    void RecordRequest(string ip, string path, string method, int statusCode, string? userAgent);
    void AssociateIdentity(string ip, Guid? userId, string? email);
    IEnumerable<SuspiciousIpSummary> GetSuspiciousIps(string? search = null, int minRiskScore = 0, int limit = 100);

    // IP blocking
    bool IsIpBlocked(string ip);
    void BlockIp(string ip, string reason, bool isAutomatic, TimeSpan? duration = null);
    bool UnblockIp(string ip);
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
    private readonly ConcurrentDictionary<string, IpActivityState> _ipActivities = new();
    private readonly ConcurrentQueue<SecurityEvent> _events = new();
    private const int MaxEvents = 1000;

    private static readonly string[] SuspiciousUserAgentMarkers =
    [
        "sqlmap", "nikto", "nmap", "masscan", "acunetix", "nessus", "wpscan", "dirbuster"
    ];

    // ---- Rate Limiting ----

    public bool IsRateLimited(string ip, string path)
    {
        if (IsIpBlocked(ip)) return true;

        var normalizedPath = NormalizeRateLimitPath(path);
        var limit = StrictPaths.TryGetValue(normalizedPath, out var strict)
            ? strict
            : MaxRequestsPerWindow;
        var rateKey = $"{ip}|{normalizedPath}";

        var entry = _rateLimits.AddOrUpdate(rateKey,
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
                $"Exceeded {limit} req/min on {normalizedPath}", path);

            // Auto-block after 3x the limit in 1 window
            if (entry.Timestamps.Count > limit * 3)
            {
                BlockIp(ip, $"Auto-blocked: rate limit exceeded on {normalizedPath}", true, TimeSpan.FromHours(1));
                RecordEvent(SecurityEventType.AutoBanned, ip,
                    $"Auto-blocked for 1h: DoS pattern on {normalizedPath}", path);
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

    public int ResetRateLimit(string ip)
    {
        var removed = 0;
        foreach (var key in _rateLimits.Keys.Where(k => k == ip || k.StartsWith($"{ip}|", StringComparison.Ordinal)).ToList())
        {
            if (_rateLimits.TryRemove(key, out _)) removed++;
        }

        return removed;
    }

    public void RecordRequest(string ip, string path, string method, int statusCode, string? userAgent)
    {
        if (string.IsNullOrWhiteSpace(ip) || ip == "unknown") return;

        var now = DateTime.UtcNow;
        var state = _ipActivities.GetOrAdd(ip, _ => new IpActivityState(now));
        lock (state.SyncRoot)
        {
            state.LastSeen = now;
            state.Requests.Enqueue(new SecurityRequestSample(now, NormalizeRateLimitPath(path), method, statusCode));
            PruneRequestSamples(state, now);

            if (!string.IsNullOrWhiteSpace(userAgent) &&
                SuspiciousUserAgentMarkers.Any(marker => userAgent.Contains(marker, StringComparison.OrdinalIgnoreCase)))
            {
                state.SuspiciousUserAgentCount++;
                if (state.SuspiciousUserAgentCount == 1)
                    RecordEvent(SecurityEventType.AnomalousUserAgent, ip, "Known security-scanner user agent detected", path);
            }
        }

        TrimTrackedIps();
    }

    public void AssociateIdentity(string ip, Guid? userId, string? email)
    {
        if (string.IsNullOrWhiteSpace(ip) || ip == "unknown" || (userId is null && string.IsNullOrWhiteSpace(email))) return;

        var state = _ipActivities.GetOrAdd(ip, _ => new IpActivityState(DateTime.UtcNow));
        lock (state.SyncRoot)
        {
            if (userId.HasValue) state.UserIds.Add(userId.Value.ToString());
            if (!string.IsNullOrWhiteSpace(email)) state.Emails.Add(email.Trim());
        }
    }

    public IEnumerable<SuspiciousIpSummary> GetSuspiciousIps(string? search = null, int minRiskScore = 0, int limit = 100)
    {
        var now = DateTime.UtcNow;
        var cutoff = now.AddMinutes(-SharedConstants.Security.TelemetryRetentionMinutes);

        foreach (var stale in _ipActivities.Where(x => x.Value.LastSeen < cutoff).Select(x => x.Key).ToList())
            _ipActivities.TryRemove(stale, out _);

        var summaries = _ipActivities
            .Select(pair => BuildSuspiciousIpSummary(pair.Key, pair.Value, now))
            .Where(summary => summary.RiskScore >= Math.Clamp(minRiskScore, 0, 100));

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            summaries = summaries.Where(summary =>
                summary.IpAddress.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                summary.AssociatedEmails.Any(email => email.Contains(term, StringComparison.OrdinalIgnoreCase)) ||
                summary.AssociatedUserIds.Any(id => id.Contains(term, StringComparison.OrdinalIgnoreCase)));
        }

        return summaries
            .OrderByDescending(summary => summary.RiskScore)
            .ThenByDescending(summary => summary.LastSeen)
            .Take(Math.Clamp(limit, 1, 500))
            .ToList();
    }

    private SuspiciousIpSummary BuildSuspiciousIpSummary(string ip, IpActivityState state, DateTime now)
    {
        List<SecurityRequestSample> samples;
        List<string> userIds;
        List<string> emails;
        int suspiciousUserAgents;
        DateTime lastSeen;

        lock (state.SyncRoot)
        {
            PruneRequestSamples(state, now);
            samples = state.Requests.ToList();
            userIds = state.UserIds.Order().ToList();
            emails = state.Emails.Order().ToList();
            suspiciousUserAgents = state.SuspiciousUserAgentCount;
            lastSeen = state.LastSeen;
        }

        var lastMinute = samples.Where(x => x.Timestamp >= now.AddMinutes(-1)).ToList();
        var lastHour = samples.Where(x => x.Timestamp >= now.AddHours(-1)).ToList();
        var failedRequests = lastHour.Count(x => x.StatusCode >= 400);
        var errorRate = lastHour.Count == 0 ? 0 : failedRequests * 100d / lastHour.Count;
        var distinctPaths = lastHour.Select(x => x.Path).Distinct(StringComparer.OrdinalIgnoreCase).Count();
        var failedLogins = _rateLimits.TryGetValue(ip, out var loginEntry) ? loginEntry.FailedLoginCount : 0;
        var threatEvents = _events.Where(x => x.IpAddress == ip && x.Timestamp >= now.AddHours(-24)).ToList();
        var signals = new List<string>();
        var score = 0;

        var suspiciousPayloads = threatEvents.Count(x => x.Type == SecurityEventType.SuspiciousPayload);
        if (suspiciousPayloads > 0) { score += Math.Min(60, suspiciousPayloads * 30); signals.Add("suspicious_payload"); }

        var bruteForceEvents = threatEvents.Count(x => x.Type == SecurityEventType.BruteForceDetected);
        if (bruteForceEvents > 0) { score += 40; signals.Add("brute_force"); }

        var rateLimitEvents = threatEvents.Count(x => x.Type == SecurityEventType.RateLimitExceeded);
        if (rateLimitEvents > 0) { score += Math.Min(35, 15 + rateLimitEvents); signals.Add("rate_limit"); }

        if (failedLogins > 0) { score += Math.Min(30, failedLogins * 4); signals.Add("failed_login"); }
        if (lastMinute.Count >= SharedConstants.Security.HighRequestRatePerMinute) { score += 30; signals.Add("high_request_rate"); }
        else if (lastMinute.Count >= SharedConstants.Security.SuspiciousRequestRatePerMinute) { score += 15; signals.Add("elevated_request_rate"); }
        if (lastHour.Count >= 20 && errorRate >= 70) { score += 15; signals.Add("high_error_rate"); }
        if (distinctPaths >= 25) { score += 10; signals.Add("endpoint_scanning"); }
        if (suspiciousUserAgents > 0) { score += 35; signals.Add("scanner_user_agent"); }

        score = Math.Min(100, score);
        var riskLevel = score >= SharedConstants.Security.CriticalRiskScore ? "critical"
            : score >= SharedConstants.Security.HighRiskScore ? "high"
            : score >= SharedConstants.Security.MediumRiskScore ? "medium"
            : "low";

        var topPaths = lastHour
            .GroupBy(x => x.Path, StringComparer.OrdinalIgnoreCase)
            .OrderByDescending(group => group.Count())
            .Take(5)
            .Select(group => new SuspiciousIpPath(group.Key, group.Count()))
            .ToList();

        return new SuspiciousIpSummary(
            ip, score, riskLevel, state.FirstSeen, lastSeen, lastMinute.Count, lastHour.Count,
            failedRequests, Math.Round(errorRate, 1), failedLogins, threatEvents.Count, distinctPaths,
            IsIpBlocked(ip), signals, userIds, emails, topPaths);
    }

    private static void PruneRequestSamples(IpActivityState state, DateTime now)
    {
        var cutoff = now.AddMinutes(-SharedConstants.Security.TelemetryRetentionMinutes);
        while (state.Requests.Count > 0 &&
               (state.Requests.Peek().Timestamp < cutoff || state.Requests.Count > SharedConstants.Security.MaxSamplesPerIp))
        {
            state.Requests.Dequeue();
        }
    }

    private void TrimTrackedIps()
    {
        var overflow = _ipActivities.Count - SharedConstants.Security.MaxTrackedIps;
        if (overflow <= 0) return;

        foreach (var key in _ipActivities.OrderBy(x => x.Value.LastSeen).Take(overflow).Select(x => x.Key).ToList())
            _ipActivities.TryRemove(key, out _);
    }

    private static string NormalizeRateLimitPath(string path)
    {
        var normalized = (path ?? "/").ToLowerInvariant();
        foreach (var strictPath in StrictPaths.Keys)
        {
            if (normalized.StartsWith(strictPath, StringComparison.OrdinalIgnoreCase))
                return strictPath;
        }

        if (normalized.StartsWith("/api/v1/posts", StringComparison.OrdinalIgnoreCase)) return "/api/v1/posts";
        if (normalized.StartsWith("/api/v1/reels", StringComparison.OrdinalIgnoreCase)) return "/api/v1/reels";
        if (normalized.StartsWith("/api/v1/comments", StringComparison.OrdinalIgnoreCase)) return "/api/v1/comments";
        if (normalized.StartsWith("/api/v1/messages", StringComparison.OrdinalIgnoreCase)) return "/api/v1/messages";
        if (normalized.StartsWith("/api/v1/notifications", StringComparison.OrdinalIgnoreCase)) return "/api/v1/notifications";
        if (normalized.StartsWith("/api/v1/admin", StringComparison.OrdinalIgnoreCase)) return "/api/v1/admin";

        return normalized;
    }

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

    public bool UnblockIp(string ip)
    {
        var removed = _blockedIps.TryRemove(ip, out _);
        if (removed)
            RecordEvent(SecurityEventType.IpManualUnblocked, ip, "IP unblocked by admin");
        return removed;
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
