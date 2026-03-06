using AutoMapper;
using FacebookClone.Application.DTOs.Notification;
using FacebookClone.Application.DTOs.User;
using FacebookClone.Application.Services.Interfaces;
using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Interfaces;
using Microsoft.AspNetCore.SignalR; // 👈 Thêm using này

// 🚨 KHOAN ĐÃ: Vì Application không thể gọi ngược lên API, chúng ta sẽ tạo một Interface trung gian.

namespace FacebookClone.Application.Services.Implementations;

public class NotificationService : INotificationService
{
    private readonly INotificationRepository _notificationRepo;
    private readonly IMapper _mapper;
    private readonly INotificationHubService _hubService; // 👈 THÊM DÒNG NÀY

    public NotificationService(INotificationRepository notificationRepo, IMapper mapper, INotificationHubService hubService)
    {
        _notificationRepo = notificationRepo;
        _mapper = mapper;
        _hubService = hubService;
    }

    public async Task CreateNotificationAsync(Guid userId, Guid actorId, NotificationType type, Guid referenceId)
    {
        // Không tự gửi thông báo cho chính mình (Tự like bài mình thì không báo)
        if (userId == actorId) return;

        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,       // Người nhận
            ActorId = actorId,     // Người thực hiện hành động (VD: Bob like bài của Alice)
            Type = type,
            ReferenceId = referenceId, // ID của bài viết hoặc ID của yêu cầu kết bạn
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        await _notificationRepo.AddNotificationAsync(notification);
        
        // 💡 NOTE: Sau này ở đây chúng ta sẽ gọi SignalR Hub để đẩy thông báo realtime xuống Frontend!
        // 👇 Bắn Real-time xuống Frontend!
        await _hubService.SendNotificationToUserAsync(userId, "Bạn có một thông báo mới!");
    }

    public async Task<IEnumerable<NotificationResponseDto>> GetMyNotificationsAsync(Guid userId, int pageNumber = 1, int pageSize = 10)
    {
        var notis = await _notificationRepo.GetUserNotificationsAsync(userId, pageNumber, pageSize);
        
        // Map bằng tay hoặc cấu hình AutoMapper (Ở đây tui map tay cho nhanh và đỡ lỗi thiếu Profile)
        return notis.Select(n => new NotificationResponseDto
        {
            Id = n.Id,
            Type = n.Type,
            ReferenceId = n.ReferenceId,
            IsRead = n.IsRead,
            CreatedAt = n.CreatedAt,
            Actor = _mapper.Map<UserProfileDto>(n.Actor) 
        });
    }

    public async Task<bool> MarkAsReadAsync(Guid userId, Guid notificationId)
    {
        var noti = await _notificationRepo.GetByIdAsync(notificationId);
        if (noti == null || noti.UserId != userId) throw new Exception("Không tìm thấy thông báo.");

        noti.IsRead = true;
        await _notificationRepo.UpdateAsync(noti);
        return true;
    }

    public async Task<bool> MarkAllAsReadAsync(Guid userId)
    {
        await _notificationRepo.MarkAllAsReadAsync(userId);
        return true;
    }
}