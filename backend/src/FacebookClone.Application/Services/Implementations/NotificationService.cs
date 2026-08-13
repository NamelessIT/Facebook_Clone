using AutoMapper;
using FacebookClone.Application.DTOs.Notification;
using FacebookClone.Application.DTOs.User;
using FacebookClone.Application.Services.Interfaces;
using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace FacebookClone.Application.Services.Implementations;

public class NotificationService : INotificationService
{
    private readonly INotificationRepository _notificationRepo;
    private readonly IMapper _mapper;
    private readonly INotificationHubService _hubService;
    private readonly IUserBlockRepository _userBlocks;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        INotificationRepository notificationRepo,
        IUserBlockRepository userBlocks,
        IMapper mapper,
        INotificationHubService hubService,
        ILogger<NotificationService> logger)
    {
        _notificationRepo = notificationRepo;
        _userBlocks = userBlocks;
        _mapper = mapper;
        _hubService = hubService;
        _logger = logger;
    }

    public async Task CreateNotificationAsync(
        Guid userId, Guid actorId, NotificationType type, Guid referenceId, string? message = null)
    {
        // Khong tu gui thong bao cho chinh minh
        if (userId == actorId) return;
        if (await _userBlocks.IsFullyBlockedBetweenAsync(userId, actorId)) return;

        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            ActorId = actorId,
            Type = type,
            ReferenceId = referenceId,
            Message = message,
            IsRead = false,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow
        };

        await _notificationRepo.AddNotificationAsync(notification);

        _logger.LogInformation(
            "[Notification] Created | To={UserId} | From={ActorId} | Type={Type} | RefId={RefId}",
            userId, actorId, type, referenceId);

        // Reload actor info de gui qua SignalR
        var dto = await BuildDtoAsync(notification);

        await _hubService.SendNotificationAsync(userId, dto);

        var unreadCount = await _notificationRepo.GetUnreadCountAsync(userId);
        await _hubService.SendBadgeUpdateAsync(userId, unreadCount);
    }

    public async Task<(IEnumerable<NotificationResponseDto> Items, int Total)> GetMyNotificationsAsync(
        Guid userId, int pageNumber = 1, int pageSize = 10)
    {
        pageSize = Math.Clamp(pageSize, 1, 100);
        var notifications = await _notificationRepo.GetUserNotificationsAsync(userId, pageNumber, pageSize);
        var total = await _notificationRepo.GetTotalCountAsync(userId);

        var items = notifications.Select(n => new NotificationResponseDto
        {
            Id = n.Id,
            Type = n.Type,
            ReferenceId = n.ReferenceId,
            Message = n.Message,
            IsRead = n.IsRead,
            CreatedAt = n.CreatedAt,
            Actor = _mapper.Map<UserProfileDto>(n.Actor)
        });

        return (items, total);
    }

    public async Task<int> GetUnreadCountAsync(Guid userId)
    {
        return await _notificationRepo.GetUnreadCountAsync(userId);
    }

    public async Task<bool> MarkAsReadAsync(Guid userId, Guid notificationId)
    {
        var notification = await _notificationRepo.GetByIdAsync(notificationId);
        if (notification == null || notification.UserId != userId)
            throw new UnauthorizedAccessException("Khong tim thay thong bao hoac khong co quyen.");

        notification.IsRead = true;
        await _notificationRepo.UpdateAsync(notification);

        // Cap nhat badge sau khi danh dau doc
        var unreadCount = await _notificationRepo.GetUnreadCountAsync(userId);
        await _hubService.SendBadgeUpdateAsync(userId, unreadCount);

        return true;
    }

    public async Task<bool> MarkAllAsReadAsync(Guid userId)
    {
        await _notificationRepo.MarkAllAsReadAsync(userId);

        await _hubService.SendBadgeUpdateAsync(userId, 0);

        return true;
    }

    public async Task<bool> DeleteNotificationAsync(Guid userId, Guid notificationId)
    {
        var notification = await _notificationRepo.GetByIdAsync(notificationId);
        if (notification == null || notification.UserId != userId)
            throw new UnauthorizedAccessException("Khong tim thay thong bao hoac khong co quyen.");

        await _notificationRepo.DeleteNotificationAsync(notificationId);

        _logger.LogInformation("[Notification] Deleted | Id={NotifId} | UserId={UserId}", notificationId, userId);

        // Cap nhat badge
        var unreadCount = await _notificationRepo.GetUnreadCountAsync(userId);
        await _hubService.SendBadgeUpdateAsync(userId, unreadCount);

        return true;
    }

    // Helper: build DTO sau khi tao notification (actor da duoc eager load tu AddNotificationAsync via GetByIdAsync)
    private async Task<NotificationResponseDto> BuildDtoAsync(Notification notification)
    {
        // Actor co the chua duoc load — lay lai tu repo da Include Actor
        var loaded = await _notificationRepo.GetByIdAsync(notification.Id);
        if (loaded?.Actor == null) return MapToDto(notification);
        return MapToDto(loaded);
    }

    private NotificationResponseDto MapToDto(Notification n) => new()
    {
        Id = n.Id,
        Type = n.Type,
        ReferenceId = n.ReferenceId,
        Message = n.Message,
        IsRead = n.IsRead,
        CreatedAt = n.CreatedAt,
        Actor = n.Actor == null ? null! : new UserProfileDto
        {
            Id = n.Actor.Id,
            FirstName = n.Actor.FirstName,
            LastName = n.Actor.LastName,
            AvatarUrl = n.Actor.AvatarUrl,
            IsOnline = n.Actor.IsOnline
        }
    };
}
