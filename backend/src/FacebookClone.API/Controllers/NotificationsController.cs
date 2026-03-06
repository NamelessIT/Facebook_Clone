using FacebookClone.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FacebookClone.API.Controllers;

[Route("api/v1/[controller]")]
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

    [HttpGet]
    public async Task<IActionResult> GetMyNotifications([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        var notis = await _notificationService.GetMyNotificationsAsync(GetCurrentUserId(), pageNumber, pageSize);
        return Ok(new { success = true, data = notis });
    }

    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id)
    {
        try {
            await _notificationService.MarkAsReadAsync(GetCurrentUserId(), id);
            return Ok(new { success = true, message = "Đã đánh dấu đọc." });
        } catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        await _notificationService.MarkAllAsReadAsync(GetCurrentUserId());
        return Ok(new { success = true, message = "Đã đánh dấu đọc tất cả." });
    }
}