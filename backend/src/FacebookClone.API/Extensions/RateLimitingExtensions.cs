using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace FacebookClone.API.Extensions;

/// <summary>
/// ASP.NET Core rate limiting: global policy + named per-module policies.
/// Config lives in appsettings "RateLimits" (env-overridable via RateLimits__...).
/// The custom SecurityService still handles audit/security events; this handles
/// production throttling with proper 429 + Retry-After.
/// </summary>
public static class RateLimitingExtensions
{
    public const string AuthPolicy = "auth";
    public const string WritePolicy = "write";
    public const string SearchPolicy = "search";

    public static IServiceCollection AddAppRateLimiting(this IServiceCollection services, IConfiguration config)
    {
        var section = config.GetSection("RateLimits");

        // Defaults (per window) if config missing.
        var globalLimit = section.GetValue("Global:PermitLimit", 100);
        var globalWindow = section.GetValue("Global:WindowSeconds", 60);
        var authLimit = section.GetValue("Auth:PermitLimit", 10);
        var authWindow = section.GetValue("Auth:WindowSeconds", 60);
        var writeLimit = section.GetValue("Write:PermitLimit", 30);
        var writeWindow = section.GetValue("Write:WindowSeconds", 60);
        var searchLimit = section.GetValue("Search:PermitLimit", 20);
        var searchWindow = section.GetValue("Search:WindowSeconds", 60);

        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            // Global limiter: partition by userId (if authenticated) else client IP.
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
                RateLimitPartition.GetFixedWindowLimiter(
                    PartitionKey(ctx),
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = globalLimit,
                        Window = TimeSpan.FromSeconds(globalWindow),
                        QueueLimit = 0
                    }));

            AddFixedWindowPolicy(options, AuthPolicy, authLimit, authWindow);
            AddFixedWindowPolicy(options, WritePolicy, writeLimit, writeWindow);
            AddFixedWindowPolicy(options, SearchPolicy, searchLimit, searchWindow);

            options.OnRejected = async (context, token) =>
            {
                var retryAfter = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var ra)
                    ? (int)ra.TotalSeconds
                    : globalWindow;

                context.HttpContext.Response.Headers.RetryAfter =
                    retryAfter.ToString(NumberFormatInfo.InvariantInfo);

                var correlationId = context.HttpContext.TraceIdentifier;
                await context.HttpContext.Response.WriteAsJsonAsync(new
                {
                    success = false,
                    message = "Too many requests. Please slow down.",
                    retryAfter,
                    correlationId
                }, token);
            };
        });

        return services;
    }

    private static void AddFixedWindowPolicy(RateLimiterOptions options, string name, int limit, int windowSeconds)
    {
        options.AddPolicy(name, ctx =>
            RateLimitPartition.GetFixedWindowLimiter(
                PartitionKey(ctx),
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = limit,
                    Window = TimeSpan.FromSeconds(windowSeconds),
                    QueueLimit = 0
                }));
    }

    private static string PartitionKey(HttpContext ctx)
    {
        var userId = ctx.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                     ?? ctx.User?.FindFirst("sub")?.Value;
        if (!string.IsNullOrEmpty(userId))
            return $"user:{userId}";

        var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return $"ip:{ip}";
    }
}
