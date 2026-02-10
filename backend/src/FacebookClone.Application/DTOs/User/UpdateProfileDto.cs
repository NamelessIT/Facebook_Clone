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
}