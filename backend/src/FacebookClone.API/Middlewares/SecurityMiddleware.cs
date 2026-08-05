using FacebookClone.API.Services;

namespace FacebookClone.API.Middlewares;

public class SecurityMiddleware(RequestDelegate next, ISecurityService security, ILogger<SecurityMiddleware> logger)
{
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
        var method = ctx.Request.Method;
        var userAgent = ctx.Request.Headers.UserAgent.ToString();

        if (BypassPaths.Any(b => path.StartsWith(b, StringComparison.OrdinalIgnoreCase)))
        {
            await next(ctx);
            return;
        }

        if (security.IsIpBlocked(ip))
        {
            logger.LogWarning("Blocked IP attempted access: {Ip} -> {Path}", ip, path);
            security.RecordEvent(SecurityEventType.IpBlocked, ip, $"Blocked IP tried to access {path}", path);
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            await ctx.Response.WriteAsJsonAsync(new
            {
                success = false,
                message = "Your IP has been blocked due to suspicious activity. Contact support if this is an error."
            });
            security.RecordRequest(ip, path, method, ctx.Response.StatusCode, userAgent);
            return;
        }

        if (security.IsRateLimited(ip, path))
        {
            logger.LogWarning("Rate limit hit: {Ip} -> {Path}", ip, path);
            ctx.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            ctx.Response.Headers["Retry-After"] = "60";
            await ctx.Response.WriteAsJsonAsync(new
            {
                success = false,
                message = "Too many requests. Please wait about 60 seconds and try again.",
                retryAfter = 60
            });
            security.RecordRequest(ip, path, method, ctx.Response.StatusCode, userAgent);
            return;
        }

        if (ctx.Request.Method is "POST" or "PUT" or "PATCH" &&
            IsTextPayload(ctx.Request) &&
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
                    errorCode = "SECURITY_PAYLOAD_BLOCKED",
                    message = "Request blocked because a text field matched a blocked security pattern.",
                    correlationId = ctx.Items["X-Correlation-Id"]?.ToString() ?? ctx.TraceIdentifier
                });
                security.RecordRequest(ip, path, method, ctx.Response.StatusCode, userAgent);
                return;
            }
        }

        await next(ctx);

        if (path.Contains("/auth/login", StringComparison.OrdinalIgnoreCase) &&
            ctx.Response.StatusCode == StatusCodes.Status401Unauthorized)
        {
            security.RecordFailedLogin(ip);
        }

        security.RecordRequest(ip, path, method, ctx.Response.StatusCode, userAgent);
    }

    private static string GetClientIp(HttpContext ctx)
    {
        // Trusted proxy middleware must resolve forwarded headers first. Reading
        // X-Forwarded-For directly here would let clients spoof their address.
        return ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    private static bool ShouldBypassPayloadInspection(string path)
        => PayloadInspectionBypassPaths.Any(b => path.StartsWith(b, StringComparison.OrdinalIgnoreCase));

    private static bool IsTextPayload(HttpRequest request)
    {
        var contentType = request.ContentType;
        if (string.IsNullOrWhiteSpace(contentType)) return false;

        return contentType.StartsWith("application/json", StringComparison.OrdinalIgnoreCase) ||
               contentType.StartsWith("application/x-www-form-urlencoded", StringComparison.OrdinalIgnoreCase) ||
               contentType.StartsWith("text/", StringComparison.OrdinalIgnoreCase);
    }
}
