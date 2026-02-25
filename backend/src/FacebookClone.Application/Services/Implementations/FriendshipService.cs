using AutoMapper;
using FacebookClone.Application.DTOs.Friendship;
using FacebookClone.Application.DTOs.User;
using FacebookClone.Application.Services.Interfaces;
using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Interfaces;

namespace FacebookClone.Application.Services.Implementations;

public class FriendshipService : IFriendshipService
{
    private readonly IFriendshipRepository _friendshipRepo;
    private readonly IUserRepository _userRepo;
    private readonly IMapper _mapper;

    public FriendshipService(IFriendshipRepository friendshipRepo, IUserRepository userRepo, IMapper mapper)
    {
        _friendshipRepo = friendshipRepo;
        _userRepo = userRepo;
        _mapper = mapper;
    }

    public async Task<string> SendFriendRequestAsync(Guid currentUserId, Guid receiverId)
    {
        if (currentUserId == receiverId) throw new Exception("Không thể tự kết bạn với chính mình.");
        
        var receiver = await _userRepo.GetByIdAsync(receiverId);
        if (receiver == null) throw new Exception("Người dùng không tồn tại.");

        var existing = await _friendshipRepo.GetFriendshipAsync(currentUserId, receiverId);
        
        if (existing != null)
        {
            if (existing.Status == FriendshipStatus.Accepted) return "Đã là bạn bè.";
            if (existing.Status == FriendshipStatus.Pending) return "Đã gửi lời mời hoặc đang chờ chấp nhận.";
            if (existing.Status == FriendshipStatus.Blocked) throw new Exception("Không thể gửi lời mời.");
        }

        var friendship = new Friendship
        {
            Id = Guid.NewGuid(),
            RequesterId = currentUserId,
            ReceiverId = receiverId,
            Status = FriendshipStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _friendshipRepo.AddFriendshipAsync(friendship);
        return "Đã gửi lời mời kết bạn.";
    }

    public async Task<string> RespondToRequestAsync(Guid currentUserId, Guid requesterId, bool isAccepted)
    {
        // currentUserId là người NHẬN lời mời, requesterId là người GỬI
        var friendship = await _friendshipRepo.GetFriendshipAsync(requesterId, currentUserId);
        
        if (friendship == null || friendship.Status != FriendshipStatus.Pending || friendship.ReceiverId != currentUserId)
            throw new Exception("Lời mời không tồn tại hoặc không hợp lệ.");

        if (isAccepted)
        {
            friendship.Status = FriendshipStatus.Accepted;
            friendship.UpdatedAt = DateTime.UtcNow;
            await _friendshipRepo.UpdateFriendshipAsync(friendship);
            return "Đã chấp nhận lời mời kết bạn.";
        }
        else
        {
            await _friendshipRepo.RemoveFriendshipAsync(friendship);
            return "Đã từ chối lời mời kết bạn.";
        }
    }

    public async Task<string> UnfriendAsync(Guid currentUserId, Guid friendId)
    {
        var friendship = await _friendshipRepo.GetFriendshipAsync(currentUserId, friendId);
        if (friendship == null || friendship.Status != FriendshipStatus.Accepted)
            throw new Exception("Không tìm thấy thông tin bạn bè.");

        await _friendshipRepo.RemoveFriendshipAsync(friendship);
        return "Đã hủy kết bạn.";
    }

    public async Task<IEnumerable<FriendResponseDto>> GetFriendsAsync(Guid userId)
    {
        var friendships = await _friendshipRepo.GetFriendsListAsync(userId);
        var result = new List<FriendResponseDto>();

        foreach (var f in friendships)
        {
            // Xác định xem ai là bạn (vì mình có thể là Requester hoặc Receiver)
            var friendUser = f.RequesterId == userId ? f.Receiver : f.Requester;
            
            result.Add(new FriendResponseDto
            {
                FriendshipId = f.Id,
                UserId = friendUser.Id,
                Profile = _mapper.Map<UserProfileDto>(friendUser),
                Status = f.Status,
                CreatedAt = f.CreatedAt
            });
        }
        return result;
    }

    public async Task<IEnumerable<FriendResponseDto>> GetPendingRequestsAsync(Guid userId)
    {
        var requests = await _friendshipRepo.GetPendingRequestsAsync(userId);
        var result = requests.Select(f => new FriendResponseDto
        {
            FriendshipId = f.Id,
            UserId = f.Requester.Id,
            Profile = _mapper.Map<UserProfileDto>(f.Requester),
            Status = f.Status,
            CreatedAt = f.CreatedAt
        });
        return result;
    }
}