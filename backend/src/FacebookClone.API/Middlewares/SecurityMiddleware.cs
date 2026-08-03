using FacebookClone.API.Services;

namespace FacebookClone.API.Middlewares;

public class SecurityMiddleware(RequestDelegate next, ISecurityService security, ILogger<SecurityMiddleware> logger)
{
    // These paths skip rate-limiting entirely (health checks, static files, swagger)
    private static readonly HashSet<string> BypassPaths =
    [
        "/swagger", "/favicon", "/health", "/hubs"
    ];

    private static readonly string[] PayloadInspectionBypassPaths =
    [
        "/api/v1/admin/localization"
    ];

    public async Task InvokeAsync(HttpContext ctx)
    {
        var ip = GetClientIp(ctx);
        var path = ctx.Request.Path.Value ?? "/";

        // Skip if path is in bypass list
        if (BypassPaths.Any(b => path.StartsWith(b, StringComparison.OrdinalIgnoreCase)))
        {
            await next(ctx);
            return;
        }

        // 1. Blocked IP check
        if (security.IsIpBlocked(ip))
        {
            logger.LogWarning("Blocked IP attempted access: {Ip} → {Path}", ip, path);
            security.RecordEvent(SecurityEventType.IpBlocked, ip, $"Blocked IP tried to access {path}", path);
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            await ctx.Response.WriteAsJsonAsync(new
            {
                success = false,
                message = "Your IP has been blocked due to suspicious activity. Contact support if this is an error."
            });
            return;
        }

        // 2. Rate limit check
        if (security.IsRateLimited(ip, path))
        {
            logger.LogWarning("Rate limit hit: {Ip} → {Path}", ip, path);
            ctx.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            ctx.Response.Headers["Retry-After"] = "60";
            await ctx.Response.WriteAsJsonAsync(new
            {
                success = false,
                message = "Too many requests. Please wait about 60 seconds and try again.",
                retryAfter = 60
            });
            return;
        }

        // 3. Payload inspection for POST/PUT/PATCH
        if (ctx.Request.Method is "POST" or "PUT" or "PATCH" &&
            !ShouldBypassPayloadInspection(path))
        {
            ctx.Request.EnableBuffering();
            using var reader = new StreamReader(ctx.Request.Body, leaveOpen: true);
            var body = await reader.ReadToEndAsync();
            ctx.Request.Body.Position = 0;

            if (!string.IsNullOrEmpty(body) &&
                security is SecurityService svc &&
                svc.ContainsSuspiciousPayload(body, out var matched))
            {
                logger.LogWarning("Suspicious payload from {Ip} on {Path}: {Match}", ip, path, matched);
                security.RecordEvent(SecurityEventType.SuspiciousPayload, ip,
                    $"Suspicious pattern '{matched}' on {path}", path);

                ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
                await ctx.Response.WriteAsJsonAsync(new
                {
                    success = false,
                    message = "Request blocked: suspicious content detected."
                });
                return;
            }
        }

        // 4. Record failed logins (scan for 401 responses on auth paths)
        await next(ctx);

        if (path.Contains("/auth/login", StringComparison.OrdinalIgnoreCase) &&
            ctx.Response.StatusCode == StatusCodes.Status401Unauthorized)
        {
            security.RecordFailedLogin(ip);
        }
    }

    private static string GetClientIp(HttpContext ctx)
    {
        // Respect reverse-proxy headers
        var forwarded = ctx.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwarded))
            return forwarded.Split(',')[0].Trim();

        var realIp = ctx.Request.Headers["X-Real-IP"].FirstOrDefault();
        if (!string.IsNullOrEmpty(realIp))
            return realIp;

        return ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    private static bool ShouldBypassPayloadInspection(string path)
        => PayloadInspectionBypassPaths.Any(b => path.StartsWith(b, StringComparison.OrdinalIgnoreCase));
}
