using AutoMapper;
using FacebookClone.Application.DTOs.Chat;
using FacebookClone.Application.DTOs.User;
using FacebookClone.Application.Services.Interfaces;
using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Interfaces;

namespace FacebookClone.Application.Services.Implementations;

public class ChatService : IChatService
{
    private readonly IChatRepository _chatRepo;
    private readonly IUserRepository _userRepo;
    private readonly IChatHubService _chatHubService;
    private readonly IMapper _mapper;

    public ChatService(IChatRepository chatRepo, IUserRepository userRepo, IChatHubService chatHubService, IMapper mapper)
    {
        _chatRepo = chatRepo;
        _userRepo = userRepo;
        _chatHubService = chatHubService;
        _mapper = mapper;
    }

    public async Task<MessageResponseDto> SendMessageAsync(Guid senderId, SendMessageRequest request)
    {
        Conversation? conversation = null;

        // 1. Tìm hoặc tạo phòng chat
        if (request.ConversationId.HasValue)
        {
            conversation = await _chatRepo.GetConversationByIdAsync(request.ConversationId.Value);
            if (conversation == null) throw new Exception("Không tìm thấy phòng chat.");
        }
        else if (request.ReceiverId.HasValue)
        {
            if (senderId == request.ReceiverId.Value) throw new Exception("Không thể tự chat với chính mình.");
            
            conversation = await _chatRepo.GetPrivateConversationAsync(senderId, request.ReceiverId.Value);
            
            // Nếu chưa từng chat, tạo phòng mới
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
                        new ConversationMember { UserId = request.ReceiverId.Value, JoinedAt = DateTime.UtcNow }
                    }
                };
                await _chatRepo.CreateConversationAsync(conversation);
            }
        }
        else
        {
            throw new Exception("Phải cung cấp ConversationId hoặc ReceiverId.");
        }

        // 2. Tạo tin nhắn
        var message = new Message
        {
            Id = Guid.NewGuid(),
            ConversationId = conversation.Id,
            SenderId = senderId,
            Content = request.Content,
            MessageType = request.MessageType,
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        await _chatRepo.AddMessageAsync(message);

        // Kéo thông tin User gửi để trả về Frontend khỏi bị null
        message.Sender = (await _userRepo.GetByIdAsync(senderId))!;

        var messageDto = new MessageResponseDto
        {
            Id = message.Id,
            ConversationId = message.ConversationId,
            Content = message.Content,
            MessageType = message.MessageType,
            CreatedAt = message.CreatedAt,
            Sender = _mapper.Map<UserProfileDto>(message.Sender)
        };

        // 3. BẮN SIGNALR REAL-TIME CHO NGƯỜI NHẬN
        var receiver = conversation.Members.FirstOrDefault(m => m.UserId != senderId);
        if (receiver != null)
        {
            await _chatHubService.SendMessageToUserAsync(receiver.UserId, messageDto);
        }

        return messageDto;
    }

    public async Task<IEnumerable<MessageResponseDto>> GetMessagesAsync(Guid conversationId, int pageNumber, int pageSize)
    {
        var messages = await _chatRepo.GetMessagesAsync(conversationId, pageNumber, pageSize);
        return messages.Select(m => new MessageResponseDto
        {
            Id = m.Id,
            ConversationId = m.ConversationId,
            Content = m.Content,
            MessageType = m.MessageType,
            CreatedAt = m.CreatedAt,
            Sender = _mapper.Map<UserProfileDto>(m.Sender)
        });
    }
}