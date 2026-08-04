namespace FacebookClone.API.Middlewares;
using System.Text.Json;
using FacebookClone.Application.Common.Exceptions;
using FacebookClone.Domain.Exceptions; 
public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task Invoke(HttpContext context)
    {
        var correlationId = context.Items["X-Correlation-Id"]?.ToString() ?? context.TraceIdentifier;

        try
        {
            await _next(context);
        }
        catch (AppException ex)
        {
            _logger.LogWarning(ex,
                "Application error {ErrorCode} for {Method} {Path}. CorrelationId: {CorrelationId}",
                ex.ErrorCode, context.Request.Method, context.Request.Path, correlationId);

            context.Response.StatusCode = ex.StatusCode;
            context.Response.ContentType = "application/json";

            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                success = false,
                message = ex.Message,
                errorCode = ex.ErrorCode,
                correlationId
            }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Unhandled exception for {Method} {Path}. CorrelationId: {CorrelationId}",
                context.Request.Method, context.Request.Path, correlationId);

            context.Response.StatusCode = 500;
            context.Response.ContentType = "application/json";

            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                success = false,
                message = "Internal server error",
                errorCode = "INTERNAL_SERVER_ERROR",
                correlationId
            }));
        }
    }
}
