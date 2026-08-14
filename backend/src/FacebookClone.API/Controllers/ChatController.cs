using FacebookClone.Application.DTOs.Chat;
using FacebookClone.Application.Services.Interfaces;
using FacebookClone.API.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FacebookClone.API.Controllers;

[Route("api/v1/chat")]
[ApiController]
[Authorize]
public class ChatController : ControllerBase
{
    private readonly IChatService _chatService;

    public ChatController(IChatService chatService)
    {
        _chatService = chatService;
    }

    private Guid GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(idClaim!);
    }

    private string? GetCorrelationId() =>
        HttpContext.Items["X-Correlation-Id"]?.ToString();

    // GET /api/v1/chat/conversations
    // Lấy danh sách tất cả conversations kèm last message + unread count
    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations()
    {
        try
        {
            var userId = GetCurrentUserId();
            var conversations = await _chatService.GetConversationListAsync(userId);
            return Ok(new { success = true, data = conversations });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // GET /api/v1/chat/conversations/{conversationId}/messages?pageNumber=1&pageSize=20
    // Lấy lịch sử tin nhắn của 1 conversation (pagination)
    [HttpGet("conversations/{conversationId}/messages")]
    public async Task<IActionResult> GetMessages(
        Guid conversationId,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20)
    {
        try
        {
            pageSize = Math.Clamp(pageSize, 1, 100);
            var currentUserId = GetCurrentUserId();
            var (items, total) = await _chatService.GetMessagesAsync(conversationId, currentUserId, pageNumber, pageSize);
            var totalPages = (int)Math.Ceiling(total / (double)pageSize);

            return Ok(new
            {
                success = true,
                data = items,
                pagination = new { page = pageNumber, limit = pageSize, total, totalPages }
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { success = false, message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // POST /api/v1/chat/messages
    // Gửi tin nhắn qua REST API (thay thế hoặc fallback khi SignalR không khả dụng)
    [HttpPost("messages")]
    [EnableRateLimiting(RateLimitingExtensions.WritePolicy)]
    public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
    {
        try
        {
            var senderId = GetCurrentUserId();
            var message = await _chatService.SendMessageAsync(senderId, request, GetCorrelationId());
            return Ok(new { success = true, data = message, message = "Đã gửi tin nhắn." });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { success = false, message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("messages/{messageId:guid}")]
    [EnableRateLimiting(RateLimitingExtensions.WritePolicy)]
    public async Task<IActionResult> EditMessage(Guid messageId, [FromBody] EditMessageRequest request)
        => await ExecuteMessageAction(() => _chatService.EditMessageAsync(GetCurrentUserId(), messageId, request), "Đã chỉnh sửa tin nhắn.");

    [HttpDelete("messages/{messageId:guid}")]
    [EnableRateLimiting(RateLimitingExtensions.WritePolicy)]
    public async Task<IActionResult> HideMessage(Guid messageId)
    {
        try
        {
            await _chatService.HideMessageAsync(GetCurrentUserId(), messageId);
            return Ok(new { success = true, message = "Đã xóa tin nhắn khỏi phía bạn." });
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { success = false, message = ex.Message }); }
        catch (KeyNotFoundException ex) { return NotFound(new { success = false, message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HttpPost("messages/{messageId:guid}/recall")]
    [EnableRateLimiting(RateLimitingExtensions.WritePolicy)]
    public async Task<IActionResult> RecallMessage(Guid messageId)
        => await ExecuteMessageAction(() => _chatService.RecallMessageAsync(GetCurrentUserId(), messageId), "Đã thu hồi tin nhắn.");

    [HttpPut("messages/{messageId:guid}/pin")]
    [EnableRateLimiting(RateLimitingExtensions.WritePolicy)]
    public async Task<IActionResult> PinMessage(Guid messageId, [FromBody] PinMessageRequest request)
        => await ExecuteMessageAction(() => _chatService.SetMessagePinnedAsync(GetCurrentUserId(), messageId, request.IsPinned), request.IsPinned ? "Đã ghim tin nhắn." : "Đã bỏ ghim tin nhắn.");

    [HttpPost("messages/{messageId:guid}/forward")]
    [EnableRateLimiting(RateLimitingExtensions.WritePolicy)]
    public async Task<IActionResult> ForwardMessage(Guid messageId, [FromBody] ForwardMessageRequest request)
        => await ExecuteMessageAction(() => _chatService.ForwardMessageAsync(GetCurrentUserId(), messageId, request), "Đã chuyển tiếp tin nhắn.");

    // POST /api/v1/chat/conversations/{conversationId}/read
    // Đánh dấu tất cả messages trong conversation là đã đọc
    [HttpPost("conversations/{conversationId}/read")]
    public async Task<IActionResult> MarkAsRead(Guid conversationId)
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            await _chatService.MarkConversationAsReadAsync(conversationId, currentUserId);
            return Ok(new { success = true, message = "Đã đánh dấu đã đọc." });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { success = false, message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    private async Task<IActionResult> ExecuteMessageAction<T>(Func<Task<T>> action, string successMessage)
    {
        try
        {
            var result = await action();
            return Ok(new { success = true, data = result, message = successMessage });
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { success = false, message = ex.Message }); }
        catch (KeyNotFoundException ex) { return NotFound(new { success = false, message = ex.Message }); }
        catch (ArgumentException ex) { return BadRequest(new { success = false, message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { success = false, message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }
}
