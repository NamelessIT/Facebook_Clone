using FacebookClone.Application.DTOs.Chat;
using FacebookClone.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FacebookClone.API.Controllers;

[Route("api/v1/[controller]")]
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

    [HttpPost("messages")]
    public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
    {
        try {
            var message = await _chatService.SendMessageAsync(GetCurrentUserId(), request);
            return Ok(new { success = true, data = message });
        } catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HttpGet("conversations/{conversationId}/messages")]
    public async Task<IActionResult> GetMessages(Guid conversationId, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 20)
    {
        var messages = await _chatService.GetMessagesAsync(conversationId, pageNumber, pageSize);
        return Ok(new { success = true, data = messages });
    }
}