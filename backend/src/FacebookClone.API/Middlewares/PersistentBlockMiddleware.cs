using System.Security.Claims;
using FacebookClone.API.Services;

namespace FacebookClone.API.Middlewares;

/// <summary>
/// Enforces the persistent block/allow lists (survives restart). Whitelist is
/// checked first (bypass); blacklist returns 403. Resolves the scoped service
/// per-request via RequestServices.
/// </summary>
public class PersistentBlockMiddleware(RequestDelegate next, ILogger<PersistentBlockMiddleware> logger)
{
    private static readonly string[] BypassPaths = ["/swagger", "/favicon", "/health"];

    public async Task InvokeAsync(HttpContext ctx)
    {
        var path = ctx.Request.Path.Value ?? "/";
        if (BypassPaths.Any(b => path.StartsWith(b, StringComparison.OrdinalIgnoreCase)))
        {
            await next(ctx);
            return;
        }

        var service = ctx.RequestServices.GetRequiredService<ISecurityBlockService>();

        var ip = ctx.Connection.RemoteIpAddress?.ToString();
        Guid? userId = Guid.TryParse(ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var uid) ? uid : null;
        var email = ctx.User.FindFirst(ClaimTypes.Email)?.Value;
        ctx.RequestServices.GetRequiredService<ISecurityService>()
            .AssociateIdentity(ip ?? "unknown", userId, email);

        // Whitelist wins — skip blacklist enforcement for allow-listed identities.
        if (await service.IsWhitelistedAsync(ip, userId, email, ctx.RequestAborted))
        {
            await next(ctx);
            return;
        }

        var hit = await service.MatchBlacklistAsync(ip, userId, email, ctx.RequestAborted);
        if (hit is not null)
        {
            logger.LogWarning("Blocked request: {Kind} {Type}={Value} -> {Path}",
                hit.ListKind, hit.TargetType, hit.Value, path);
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            await ctx.Response.WriteAsJsonAsync(new
            {
                success = false,
                message = "Access denied. Your access has been restricted."
            });
            return;
        }

        await next(ctx);
    }
}
