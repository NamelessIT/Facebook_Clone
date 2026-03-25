using FacebookClone.Application.Services.Interfaces;
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

    public NotificationsController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    private Guid GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(idClaim!);
    }

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
            var count = await _notificationService.GetUnreadCountAsync(GetCurrentUserId());
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
            await _notificationService.MarkAsReadAsync(GetCurrentUserId(), id);
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
            await _notificationService.MarkAllAsReadAsync(GetCurrentUserId());
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
            await _notificationService.DeleteNotificationAsync(GetCurrentUserId(), id);
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
}
