namespace FacebookClone.API.Middlewares;

/// <summary>
/// Adds baseline security headers to every response. CSP is intentionally
/// permissive for the SPA/static assets; tighten per environment as needed.
/// </summary>
public class SecurityHeadersMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        var headers = ctx.Response.Headers;

        headers["X-Content-Type-Options"] = "nosniff";
        headers["X-Frame-Options"] = "DENY";
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
        headers["X-Permitted-Cross-Domain-Policies"] = "none";
        // Opt out of legacy XSS auditor (CSP is the modern control)
        headers["X-XSS-Protection"] = "0";

        await next(ctx);
    }
}
