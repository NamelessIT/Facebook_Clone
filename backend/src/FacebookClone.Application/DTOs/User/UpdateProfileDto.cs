using System.ComponentModel.DataAnnotations;

namespace FacebookClone.Application.DTOs.User;

public class UpdateProfileDto
{
    [MaxLength(50)]
    public string? FirstName { get; set; }

    [MaxLength(50)]
    public string? LastName { get; set; }

    [MaxLength(500)]
    public string? Bio { get; set; }

    [MaxLength(100)]
    public string? Location { get; set; }

    // Lưu ý: Avatar thường xử lý qua API Upload riêng, trả về URL string
    public string? AvatarUrl { get; set; }

    public string? CoverUrl { get; set; }
}

public class UpdatePrivacyRequest
{
    public bool PrivateProfile { get; set; }
    public bool HideFriendsList { get; set; }
    public bool OnlyFriendsCanMessage { get; set; }
}

public class UpdatePreferencesRequest
{
    public bool EmailNotifications { get; set; }
    public bool ShowOnlineStatus { get; set; }

    [MaxLength(10)]
    public string Language { get; set; } = "vi";

    [MaxLength(20)]
    public string Theme { get; set; } = "light";
}