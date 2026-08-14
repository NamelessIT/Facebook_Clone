using AutoMapper;
using FacebookClone.Application.DTOs.Chat;
using FacebookClone.Application.DTOs.User;
using FacebookClone.Application.Services.Interfaces;
using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Interfaces;
using FacebookClone.Domain.Policies;
using Microsoft.Extensions.Logging;

namespace FacebookClone.Application.Services.Implementations;

public class ChatService : IChatService
{
    private readonly IChatRepository _chatRepo;
    private readonly IUserRepository _userRepo;
    private readonly IFriendshipRepository _friendshipRepo;
    private readonly IChatHubService _chatHubService;
    private readonly IUserBlockRepository _userBlockRepo;
    private readonly IMapper _mapper;
    private readonly ILogger<ChatService> _logger;

    public ChatService(
        IChatRepository chatRepo,
        IUserRepository userRepo,
        IFriendshipRepository friendshipRepo,
        IChatHubService chatHubService,
        IUserBlockRepository userBlockRepo,
        IMapper mapper,
        ILogger<ChatService> logger)
    {
        _chatRepo = chatRepo;
        _userRepo = userRepo;
        _friendshipRepo = friendshipRepo;
        _chatHubService = chatHubService;
        _userBlockRepo = userBlockRepo;
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
        => await SendMessageCoreAsync(senderId, request, correlationId, allowNonFriendConversation, null);

    private async Task<MessageResponseDto> SendMessageCoreAsync(
        Guid senderId,
        SendMessageRequest request,
        string? correlationId,
        bool allowNonFriendConversation,
        Guid? forwardedFromMessageId)
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

        if (conversation.Type == ConversationType.Private && receiverId != Guid.Empty &&
            await _userBlockRepo.IsMessagingBlockedBetweenAsync(senderId, receiverId))
            throw new UnauthorizedAccessException("Không thể gửi tin nhắn vì một trong hai người dùng đã chặn liên hệ.");

        Message? replyTo = null;
        if (request.ReplyToMessageId.HasValue)
        {
            replyTo = await _chatRepo.GetMessageForActionAsync(request.ReplyToMessageId.Value);
            if (replyTo == null || replyTo.IsDeleted || replyTo.ConversationId != conversation.Id)
                throw new ArgumentException("Tin nhắn được trả lời không còn tồn tại trong cuộc trò chuyện này.");
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
            ReplyToMessageId = replyTo?.Id,
            ReplyToMessage = replyTo,
            ForwardedFromMessageId = forwardedFromMessageId,
            IsRead = false,
            IsDeleted = false,
            IsRecalled = false,
            IsPinned = false
        };

        await _chatRepo.AddMessageAsync(message);
        await _chatRepo.UpdateLastMessageAtAsync(conversation.Id, sentAt);

        _logger.LogInformation(
            "[Chat] Message sent | CorrelationId={CorrelationId} | From={From} | To={To} | ConversationId={ConvId} | At={At}",
            correlationId ?? "N/A", senderId, receiverId, conversation.Id, sentAt);

        var senderUser = await _userRepo.GetByIdAsync(senderId);
        message.Sender = senderUser!;

        var dto = MapToDto(message);

        var recipients = (await _chatRepo.GetConversationMemberIdsAsync(conversation.Id))
            .Where(id => id != senderId)
            .ToList();
        await _chatHubService.SendEventToUsersAsync(recipients, "ReceiveMessage", dto);

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

        var (messages, total) = await _chatRepo.GetMessagesAsync(conversationId, currentUserId, pageNumber, pageSize);
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
                Type = (int)conv.Type,
                DisplayName = conv.Type == ConversationType.Group
                    ? $"Nhóm {conv.Id.ToString()[..8]}"
                    : otherMember.User.FullName,
                AvatarUrl = conv.Type == ConversationType.Private ? otherMember.User.AvatarUrl : null,
                MemberCount = conv.Members.Count,
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

    public async Task<MessageMutationResponseDto> EditMessageAsync(
        Guid currentUserId, Guid messageId, EditMessageRequest request)
    {
        var content = request.Content.Trim();
        if (content.Length is < 1 or > 2000)
            throw new ArgumentException("Tin nhắn phải có từ 1 đến 2000 ký tự.");

        var original = await RequireMessageMemberAsync(currentUserId, messageId);
        if (original.SenderId != currentUserId)
            throw new UnauthorizedAccessException("Bạn chỉ có thể sửa tin nhắn của mình.");
        if (original.IsDeleted || original.IsRecalled)
            throw new InvalidOperationException("Tin nhắn này không còn có thể chỉnh sửa.");
        if (original.MessageType != MessageType.Text)
            throw new InvalidOperationException("Chỉ tin nhắn văn bản mới có thể chỉnh sửa.");
        var latest = await _chatRepo.GetLatestVisibleMessageAsync(original.ConversationId);
        if (!MessagePolicy.CanEdit(original, currentUserId, latest?.Id, DateTime.UtcNow))
            throw new InvalidOperationException("Chỉ có thể sửa tin nhắn văn bản mới nhất của bạn trong vòng 15 phút.");

        var replacement = new Message
        {
            Id = Guid.NewGuid(),
            ConversationId = original.ConversationId,
            SenderId = original.SenderId,
            Sender = original.Sender,
            Content = content,
            MessageType = original.MessageType,
            CreatedAt = original.CreatedAt,
            EditedAt = DateTime.UtcNow,
            ReplyToMessageId = original.ReplyToMessageId,
            ReplyToMessage = original.ReplyToMessage,
            ForwardedFromMessageId = original.ForwardedFromMessageId,
            ReplacesMessageId = original.Id,
            IsRead = original.IsRead,
            IsDeleted = false,
            IsRecalled = false,
            IsPinned = original.IsPinned,
            PinnedById = original.PinnedById,
            PinnedAt = original.PinnedAt
        };

        await _chatRepo.ReplaceMessageAsync(original, replacement);
        var dto = MapToDto(replacement);
        await BroadcastMutationAsync(currentUserId, original.ConversationId, "MessageEdited", new
        {
            oldMessageId = original.Id,
            conversationId = original.ConversationId,
            message = dto
        });

        return new MessageMutationResponseDto
        {
            MessageId = original.Id,
            ConversationId = original.ConversationId,
            Message = dto
        };
    }

    public async Task HideMessageAsync(Guid currentUserId, Guid messageId)
    {
        var message = await RequireMessageMemberAsync(currentUserId, messageId);
        await _chatRepo.HideMessageForUserAsync(message.Id, currentUserId);
    }

    public async Task<MessageMutationResponseDto> RecallMessageAsync(Guid currentUserId, Guid messageId)
    {
        var message = await RequireMessageMemberAsync(currentUserId, messageId);
        if (message.SenderId != currentUserId)
            throw new UnauthorizedAccessException("Bạn chỉ có thể thu hồi tin nhắn của mình.");
        if (message.IsDeleted || message.IsRecalled)
            throw new InvalidOperationException("Tin nhắn đã được thu hồi hoặc thay thế.");

        message.IsRecalled = true;
        message.IsPinned = false;
        message.PinnedAt = null;
        message.PinnedById = null;
        await _chatRepo.UpdateMessageAsync(message);

        var payload = new
        {
            messageId = message.Id,
            conversationId = message.ConversationId,
            isRecalled = true
        };
        await BroadcastMutationAsync(currentUserId, message.ConversationId, "MessageRecalled", payload);
        return new MessageMutationResponseDto
        {
            MessageId = message.Id,
            ConversationId = message.ConversationId,
            IsRecalled = true
        };
    }

    public async Task<MessageMutationResponseDto> SetMessagePinnedAsync(
        Guid currentUserId, Guid messageId, bool isPinned)
    {
        var message = await RequireMessageMemberAsync(currentUserId, messageId);
        if (message.IsDeleted || message.IsRecalled)
            throw new InvalidOperationException("Không thể ghim tin nhắn đã bị thu hồi hoặc thay thế.");

        message.IsPinned = isPinned;
        message.PinnedById = isPinned ? currentUserId : null;
        message.PinnedAt = isPinned ? DateTime.UtcNow : null;
        await _chatRepo.UpdateMessageAsync(message);

        var payload = new
        {
            messageId = message.Id,
            conversationId = message.ConversationId,
            isPinned,
            pinnedById = message.PinnedById,
            pinnedAt = message.PinnedAt
        };
        await BroadcastMutationAsync(currentUserId, message.ConversationId, "MessagePinned", payload);
        return new MessageMutationResponseDto
        {
            MessageId = message.Id,
            ConversationId = message.ConversationId,
            IsPinned = isPinned
        };
    }

    public async Task<MessageResponseDto> ForwardMessageAsync(
        Guid currentUserId, Guid messageId, ForwardMessageRequest request)
    {
        var source = await RequireMessageMemberAsync(currentUserId, messageId);
        if (source.IsDeleted || source.IsRecalled)
            throw new InvalidOperationException("Không thể chuyển tiếp tin nhắn đã bị thu hồi hoặc thay thế.");
        if (!request.ConversationId.HasValue && !request.ReceiverId.HasValue)
            throw new ArgumentException("Hãy chọn người dùng hoặc nhóm nhận tin nhắn chuyển tiếp.");

        return await SendMessageCoreAsync(currentUserId, new SendMessageRequest
        {
            ConversationId = request.ConversationId,
            ReceiverId = request.ReceiverId,
            Content = source.Content,
            MessageType = source.MessageType
        }, null, false, source.Id);
    }

    private async Task<Message> RequireMessageMemberAsync(Guid currentUserId, Guid messageId)
    {
        var message = await _chatRepo.GetMessageForActionAsync(messageId);
        if (message == null)
            throw new KeyNotFoundException("Không tìm thấy tin nhắn.");
        if (!message.Conversation.Members.Any(member => member.UserId == currentUserId))
            throw new UnauthorizedAccessException("Bạn không thuộc cuộc trò chuyện này.");
        return message;
    }

    private async Task BroadcastMutationAsync(Guid actorId, Guid conversationId, string eventName, object payload)
    {
        var recipients = (await _chatRepo.GetConversationMemberIdsAsync(conversationId))
            .Where(id => id != actorId);
        await _chatHubService.SendEventToUsersAsync(recipients, eventName, payload);
    }

    private static MessageResponseDto MapToDto(Message m) => new()
    {
        Id = m.Id,
        ConversationId = m.ConversationId,
        Content = m.Content,
        MessageType = m.MessageType,
        IsRead = m.IsRead,
        CreatedAt = m.CreatedAt,
        EditedAt = m.EditedAt,
        IsRecalled = m.IsRecalled,
        IsPinned = m.IsPinned,
        PinnedById = m.PinnedById,
        PinnedAt = m.PinnedAt,
        IsForwarded = m.ForwardedFromMessageId.HasValue,
        ReplyTo = m.ReplyToMessage == null ? null : new MessageReplyPreviewDto
        {
            Id = m.ReplyToMessage.Id,
            SenderId = m.ReplyToMessage.SenderId,
            SenderName = m.ReplyToMessage.Sender?.FullName ?? string.Empty,
            Content = m.ReplyToMessage.IsRecalled ? "Tin nhắn đã được thu hồi" : m.ReplyToMessage.Content,
            MessageType = m.ReplyToMessage.MessageType,
            IsRecalled = m.ReplyToMessage.IsRecalled
        },
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
