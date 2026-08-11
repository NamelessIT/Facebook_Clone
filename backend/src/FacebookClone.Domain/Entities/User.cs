using System.ComponentModel.DataAnnotations.Schema;

namespace FacebookClone.Domain.Entities;

public class User
{
    public Guid Id { get; set; }

    // --- SỬA ĐỔI BẮT ĐẦU ---
    // Thay vì lưu cứng FullName, ta lưu First/Last để dễ quản lý và sort
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;

    // FullName sẽ tự động được tạo ra, không cần lưu vào DB (hoặc cấu hình EF để lưu nếu muốn)
    [NotMapped] 
    public string FullName => $"{FirstName} {LastName}".Trim();
    
    public string? Location { get; set; } // Thêm trường Location
    // --- SỬA ĐỔI KẾT THÚC ---

    public string Email { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;

    public string? AvatarUrl { get; set; }
    public string? CoverUrl { get; set; }
    public string? Bio { get; set; }
    public string? Status { get; set; }

    public bool IsOnline { get; set; }

    // --- Privacy Settings ---
    public bool PrivateProfile { get; set; } = false;
    public bool HideFriendsList { get; set; } = false;
    public bool OnlyFriendsCanMessage { get; set; } = false;

    // --- Preferences ---
    public bool EmailNotifications { get; set; } = true;
    public bool ShowOnlineStatus { get; set; } = true;
    public string Language { get; set; } = "vi";
    public string Theme { get; set; } = "light";

    public bool IsAdmin { get; set; } = false;

    // --- Ban Management ---
    public bool IsBanned { get; set; } = false;
    public string? BanReason { get; set; }
    public DateTime? BannedAt { get; set; }

    // Live-only moderation. A suspended user can still use every non-live feature.
    public bool IsLiveSuspended { get; set; } = false;
    public string? LiveSuspensionReason { get; set; }
    public DateTime? LiveSuspendedAt { get; set; }

    // Feature-scoped moderation keeps the rest of the account usable.
    public bool IsPostSuspended { get; set; } = false;
    public string? PostSuspensionReason { get; set; }
    public DateTime? PostSuspendedAt { get; set; }
    public bool IsReelSuspended { get; set; } = false;
    public string? ReelSuspensionReason { get; set; }
    public DateTime? ReelSuspendedAt { get; set; }
    public bool IsMarketplaceSuspended { get; set; } = false;
    public string? MarketplaceSuspensionReason { get; set; }
    public DateTime? MarketplaceSuspendedAt { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public bool IsDeleted { get; set; }

    /* Navigation Properties */
    public ICollection<Post> Posts { get; set; } = new List<Post>();
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    public ICollection<Message> Messages { get; set; } = new List<Message>();
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<LiveSession> LiveSessions { get; set; } = new List<LiveSession>();
    public ICollection<MarketplaceListing> MarketplaceListings { get; set; } = new List<MarketplaceListing>();

    // --- THÊM PHẦN NÀY ĐỂ SỬA LỖI FriendshipConfiguration ---
    // Danh sách lời mời kết bạn ĐÃ GỬI
    public ICollection<Friendship> SentFriendRequests { get; set; } = new List<Friendship>();
    
    // Danh sách lời mời kết bạn ĐÃ NHẬN
    public ICollection<Friendship> ReceivedFriendRequests { get; set; } = new List<Friendship>();
}
