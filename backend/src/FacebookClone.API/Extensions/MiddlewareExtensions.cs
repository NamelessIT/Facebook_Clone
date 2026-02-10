namespace FacebookClone.API.Extensions;
using FacebookClone.API.Middlewares;
public static class MiddlewareExtensions
{
    public static IApplicationBuilder UseGlobalMiddlewares(this IApplicationBuilder app)
    {
        app.UseMiddleware<CorrelationIdMiddleware>();
        app.UseMiddleware<RequestLoggingMiddleware>();
        app.UseMiddleware<AuditLogMiddleware>();
        app.UseMiddleware<ExceptionMiddleware>();

        return app;
    }
}
