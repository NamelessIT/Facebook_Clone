using FacebookClone.Application.Services.Interfaces;
using FacebookClone.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FacebookClone.API.Controllers;

[Route("api/v1/notifications")]
[ApiController]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;
    private readonly ICacheService _cache;

    public NotificationsController(INotificationService notificationService, ICacheService cache)
    {
        _notificationService = notificationService;
        _cache = cache;
    }

    private Guid GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(idClaim!);
    }

    private static string UnreadCacheKey(Guid userId) => $"notif:unread:{userId}";

    // GET /api/v1/notifications?pageNumber=1&pageSize=10
    // Lay danh sach notifications co phan trang
    [HttpGet]
    public async Task<IActionResult> GetMyNotifications(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        try
        {
            pageSize = Math.Clamp(pageSize, 1, 100);
            var userId = GetCurrentUserId();
            var (items, total) = await _notificationService.GetMyNotificationsAsync(userId, pageNumber, pageSize);
            var totalPages = (int)Math.Ceiling(total / (double)pageSize);

            return Ok(new
            {
                success = true,
                data = items,
                pagination = new { page = pageNumber, limit = pageSize, total, totalPages }
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // GET /api/v1/notifications/unread-count
    // Lay so luong notifications chua doc (dung cho badge)
    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        try
        {
            var userId = GetCurrentUserId();
            // Cached briefly (badge tolerates ~10s staleness); invalidated on read/delete.
            var count = await _cache.GetOrSetAsync(
                UnreadCacheKey(userId),
                TimeSpan.FromSeconds(10),
                () => _notificationService.GetUnreadCountAsync(userId),
                HttpContext.RequestAborted);
            return Ok(new { success = true, data = new { unreadCount = count } });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // POST /api/v1/notifications/{id}/read
    // Danh dau 1 notification la da doc
    [HttpPost("{id}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            await _notificationService.MarkAsReadAsync(userId, id);
            await _cache.RemoveAsync(UnreadCacheKey(userId));
            return Ok(new { success = true, message = "Da danh dau da doc." });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // POST /api/v1/notifications/all/read
    // Danh dau tat ca notifications la da doc
    [HttpPost("all/read")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        try
        {
            var userId = GetCurrentUserId();
            await _notificationService.MarkAllAsReadAsync(userId);
            await _cache.RemoveAsync(UnreadCacheKey(userId));
            return Ok(new { success = true, message = "Da danh dau tat ca la da doc." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // DELETE /api/v1/notifications/{id}
    // Soft delete 1 notification
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteNotification(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            await _notificationService.DeleteNotificationAsync(userId, id);
            await _cache.RemoveAsync(UnreadCacheKey(userId));
            return Ok(new { success = true, message = "Da xoa thong bao." });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // GET /api/v1/notifications/stream (Server-Sent Events)
    // Streams the unread-count to the client with a periodic heartbeat.
    // Closes cleanly when the client disconnects (RequestAborted cancellation).
    [HttpGet("stream")]
    public async Task StreamNotifications(CancellationToken clientToken)
    {
        var userId = GetCurrentUserId();
        var response = Response;
        response.Headers.ContentType = "text/event-stream";
        response.Headers.CacheControl = "no-cache";
        response.Headers["X-Accel-Buffering"] = "no"; // disable proxy buffering

        // Combine the action token with the connection-abort token.
        using var linked = CancellationTokenSource.CreateLinkedTokenSource(clientToken, HttpContext.RequestAborted);
        var ct = linked.Token;

        var interval = TimeSpan.FromSeconds(15);
        int? lastCount = null;

        try
        {
            while (!ct.IsCancellationRequested)
            {
                var count = await _notificationService.GetUnreadCountAsync(userId);

                // Only push when the value changes; always send a heartbeat comment.
                if (count != lastCount)
                {
                    await response.WriteAsync($"event: unread-count\ndata: {{\"unreadCount\":{count}}}\n\n", ct);
                    lastCount = count;
                }
                else
                {
                    await response.WriteAsync(": keep-alive\n\n", ct);
                }
                await response.Body.FlushAsync(ct);

                await Task.Delay(interval, ct);
            }
        }
        catch (OperationCanceledException)
        {
            // Client disconnected — expected, exit quietly (no leaked loop).
        }
    }
}
