using AutoMapper;
using FacebookClone.Application.DTOs.Chat;
using FacebookClone.Application.DTOs.User;
using FacebookClone.Application.Services.Interfaces;
using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace FacebookClone.Application.Services.Implementations;

public class ChatService : IChatService
{
    private readonly IChatRepository _chatRepo;
    private readonly IUserRepository _userRepo;
    private readonly IFriendshipRepository _friendshipRepo;
    private readonly IChatHubService _chatHubService;
    private readonly IMapper _mapper;
    private readonly ILogger<ChatService> _logger;

    public ChatService(
        IChatRepository chatRepo,
        IUserRepository userRepo,
        IFriendshipRepository friendshipRepo,
        IChatHubService chatHubService,
        IMapper mapper,
        ILogger<ChatService> logger)
    {
        _chatRepo = chatRepo;
        _userRepo = userRepo;
        _friendshipRepo = friendshipRepo;
        _chatHubService = chatHubService;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<bool> AreFriendsAsync(Guid userId1, Guid userId2)
    {
        var friendship = await _friendshipRepo.GetFriendshipAsync(userId1, userId2);
        return friendship != null && friendship.Status == FriendshipStatus.Accepted;
    }

    public async Task<MessageResponseDto> SendMessageAsync(
        Guid senderId,
        SendMessageRequest request,
        string? correlationId = null,
        bool allowNonFriendConversation = false)
    {
        if (string.IsNullOrWhiteSpace(request.Content))
            throw new ArgumentException("Tin nhắn không được để trống.");

        if (request.Content.Length > 2000)
            throw new ArgumentException("Tin nhắn không được vượt quá 2000 ký tự.");

        Conversation? conversation = null;
        Guid receiverId = Guid.Empty;

        if (request.ConversationId.HasValue)
        {
            conversation = await _chatRepo.GetConversationByIdAsync(request.ConversationId.Value);
            if (conversation == null)
                throw new KeyNotFoundException("Không tìm thấy phòng chat.");

            // Sender phải là thành viên trong conversation
            if (!conversation.Members.Any(m => m.UserId == senderId))
                throw new UnauthorizedAccessException("Bạn không có quyền gửi tin nhắn trong phòng chat này.");

            var otherMember = conversation.Members.FirstOrDefault(m => m.UserId != senderId);
            receiverId = otherMember?.UserId ?? Guid.Empty;
        }
        else if (request.ReceiverId.HasValue)
        {
            receiverId = request.ReceiverId.Value;
            if (senderId == receiverId)
                throw new ArgumentException("Không thể tự chat với chính mình.");

            // Chat thường vẫn yêu cầu kết bạn. Các luồng đã được API xác thực riêng
            // (ví dụ liên hệ người bán Marketplace) có thể tạo cuộc trò chuyện trực tiếp.
            if (!allowNonFriendConversation && !await AreFriendsAsync(senderId, receiverId))
                throw new UnauthorizedAccessException("Bạn chỉ có thể nhắn tin với bạn bè.");

            conversation = await _chatRepo.GetPrivateConversationAsync(senderId, receiverId);
            if (conversation == null)
            {
                conversation = new Conversation
                {
                    Id = Guid.NewGuid(),
                    Type = ConversationType.Private,
                    CreatedBy = senderId,
                    CreatedAt = DateTime.UtcNow,
                    Members = new List<ConversationMember>
                    {
                        new ConversationMember { UserId = senderId, JoinedAt = DateTime.UtcNow },
                        new ConversationMember { UserId = receiverId, JoinedAt = DateTime.UtcNow }
                    }
                };
                await _chatRepo.CreateConversationAsync(conversation);
            }
        }
        else
        {
            throw new ArgumentException("Phải cung cấp ConversationId hoặc ReceiverId.");
        }

        var sentAt = DateTime.UtcNow;
        var message = new Message
        {
            Id = Guid.NewGuid(),
            ConversationId = conversation.Id,
            SenderId = senderId,
            Content = request.Content.Trim(),
            MessageType = request.MessageType,
            CreatedAt = sentAt,
            IsRead = false,
            IsDeleted = false
        };

        await _chatRepo.AddMessageAsync(message);
        await _chatRepo.UpdateLastMessageAtAsync(conversation.Id, sentAt);

        _logger.LogInformation(
            "[Chat] Message sent | CorrelationId={CorrelationId} | From={From} | To={To} | ConversationId={ConvId} | At={At}",
            correlationId ?? "N/A", senderId, receiverId, conversation.Id, sentAt);

        var senderUser = await _userRepo.GetByIdAsync(senderId);
        message.Sender = senderUser!;

        var dto = MapToDto(message);

        // Gửi SignalR real-time cho người nhận
        if (receiverId != Guid.Empty)
            await _chatHubService.SendMessageToUserAsync(receiverId, dto);

        return dto;
    }

    public async Task<(IEnumerable<MessageResponseDto> Items, int Total)> GetMessagesAsync(
        Guid conversationId, Guid currentUserId, int pageNumber, int pageSize)
    {
        var conversation = await _chatRepo.GetConversationByIdAsync(conversationId);
        if (conversation == null)
            throw new KeyNotFoundException("Không tìm thấy phòng chat.");

        if (!conversation.Members.Any(m => m.UserId == currentUserId))
            throw new UnauthorizedAccessException("Bạn không có quyền xem tin nhắn này.");

        var (messages, total) = await _chatRepo.GetMessagesAsync(conversationId, pageNumber, pageSize);
        var dtos = messages.Select(MapToDto);
        return (dtos, total);
    }

    public async Task<IEnumerable<ConversationListItemDto>> GetConversationListAsync(Guid userId)
    {
        var conversations = await _chatRepo.GetConversationListAsync(userId);
        var result = new List<ConversationListItemDto>();

        foreach (var conv in conversations)
        {
            var otherMember = conv.Members.FirstOrDefault(m => m.UserId != userId);
            if (otherMember == null) continue;

            var lastMsg = conv.Messages.OrderByDescending(m => m.CreatedAt).FirstOrDefault();
            var unread = await _chatRepo.GetUnreadCountAsync(conv.Id, userId);

            result.Add(new ConversationListItemDto
            {
                ConversationId = conv.Id,
                OtherUser = _mapper.Map<UserProfileDto>(otherMember.User),
                LastMessageContent = lastMsg?.Content,
                LastMessageAt = lastMsg?.CreatedAt ?? conv.LastMessageAt,
                UnreadCount = unread
            });
        }

        return result;
    }

    public async Task MarkConversationAsReadAsync(Guid conversationId, Guid currentUserId)
    {
        var conversation = await _chatRepo.GetConversationByIdAsync(conversationId);
        if (conversation == null)
            throw new KeyNotFoundException("Không tìm thấy phòng chat.");

        if (!conversation.Members.Any(m => m.UserId == currentUserId))
            throw new UnauthorizedAccessException("Bạn không có quyền thực hiện thao tác này.");

        await _chatRepo.MarkConversationAsReadAsync(conversationId, currentUserId);
    }

    private static MessageResponseDto MapToDto(Message m) => new()
    {
        Id = m.Id,
        ConversationId = m.ConversationId,
        Content = m.Content,
        MessageType = m.MessageType,
        IsRead = m.IsRead,
        CreatedAt = m.CreatedAt,
        Sender = m.Sender == null ? null! : new UserProfileDto
        {
            Id = m.Sender.Id,
            FirstName = m.Sender.FirstName,
            LastName = m.Sender.LastName,
            AvatarUrl = m.Sender.AvatarUrl,
            Bio = m.Sender.Bio,
            Location = m.Sender.Location,
            IsOnline = m.Sender.IsOnline
        }
    };
}
