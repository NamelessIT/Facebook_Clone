using FacebookClone.Application.DTOs.Chat;
using FacebookClone.Application.Services.Interfaces;
using FacebookClone.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using System.Security.Claims;

namespace FacebookClone.API.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly IChatService _chatService;
    private readonly IUserRepository _userRepository;
    private readonly ILogger<ChatHub> _logger;

    public ChatHub(IChatService chatService, IUserRepository userRepository, ILogger<ChatHub> logger)
    {
        _chatService = chatService;
        _userRepository = userRepository;
        _logger = logger;
    }

    private Guid GetCurrentUserId()
    {
        var claim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(claim!);
    }

    public override async Task OnConnectedAsync()
    {
        try
        {
            var userId = GetCurrentUserId();
            var user = await _userRepository.GetByIdAsync(userId);
            if (user != null)
            {
                user.IsOnline = true;
                user.UpdatedAt = DateTime.UtcNow;
                await _userRepository.UpdateAsync(user);
            }

            // Thông báo cho bạn bè rằng user đã online
            await Clients.Others.SendAsync("UserOnline", userId);
            _logger.LogInformation("[ChatHub] User {UserId} connected. ConnectionId={ConnId}", userId, Context.ConnectionId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ChatHub] OnConnectedAsync error. ConnectionId={ConnId}", Context.ConnectionId);
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        try
        {
            var userId = GetCurrentUserId();
            var user = await _userRepository.GetByIdAsync(userId);
            if (user != null)
            {
                user.IsOnline = false;
                user.UpdatedAt = DateTime.UtcNow;
                await _userRepository.UpdateAsync(user);
            }

            await Clients.Others.SendAsync("UserOffline", userId);
            _logger.LogInformation("[ChatHub] User {UserId} disconnected. ConnectionId={ConnId}", userId, Context.ConnectionId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ChatHub] OnDisconnectedAsync error. ConnectionId={ConnId}", Context.ConnectionId);
        }

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Client gọi để gửi tin nhắn đến 1 user.
    /// </summary>
    /// <param name="receiverId">UserId của người nhận</param>
    /// <param name="content">Nội dung tin nhắn</param>
    public async Task SendMessage(string receiverId, string content)
    {
        var senderId = GetCurrentUserId();
        try
        {
            if (!Guid.TryParse(receiverId, out var receiverGuid))
            {
                await Clients.Caller.SendAsync("Error", "ReceiverId không hợp lệ.");
                return;
            }

            var request = new SendMessageRequest
            {
                ReceiverId = receiverGuid,
                Content = content
            };

            var correlationId = Context.GetHttpContext()?.Items["X-Correlation-Id"]?.ToString();
            var messageDto = await _chatService.SendMessageAsync(senderId, request, correlationId);

            // Trả về cho chính sender để hiển thị ngay
            await Clients.Caller.SendAsync("MessageSent", messageDto);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning("[ChatHub] SendMessage unauthorized | Sender={Sender} | Receiver={Receiver} | Reason={Reason}", senderId, receiverId, ex.Message);
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ChatHub] SendMessage error | Sender={Sender} | Receiver={Receiver}", senderId, receiverId);
            await Clients.Caller.SendAsync("Error", "Gửi tin nhắn thất bại. Thử lại sau.");
        }
    }

    /// <summary>
    /// Client gọi khi user đang gõ để thông báo cho người nhận.
    /// </summary>
    /// <param name="receiverId">UserId của người nhận</param>
    /// <summary>
    /// Client gọi khi user đang gõ để thông báo cho người nhận.
    /// </summary>
    /// <param name="receiverId">UserId của người nhận</param>
    public async Task TypingNotification(string receiverId)
    {
        try
        {
            if (!Guid.TryParse(receiverId, out var receiverGuid)) return;

            var senderId = GetCurrentUserId();
            await Clients.User(receiverGuid.ToString()).SendAsync("TypingIndicator", senderId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ChatHub] TypingNotification error");
        }
    }

    /// <summary>
    /// Client gọi để đánh dấu tất cả messages trong 1 conversation là đã đọc.
    /// </summary>
    /// <param name="conversationId">ID của conversation</param>
    public async Task MarkMessagesAsRead(string conversationId)
    {
        var currentUserId = GetCurrentUserId();
        try
        {
            if (!Guid.TryParse(conversationId, out var convGuid))
            {
                await Clients.Caller.SendAsync("Error", "ConversationId không hợp lệ.");
                return;
            }

            await _chatService.MarkConversationAsReadAsync(convGuid, currentUserId);
            await Clients.Caller.SendAsync("MessagesMarkedRead", conversationId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ChatHub] MarkMessagesAsRead error | UserId={UserId} | ConvId={ConvId}", currentUserId, conversationId);
            await Clients.Caller.SendAsync("Error", "Không thể đánh dấu đã đọc.");
        }
    }
}
