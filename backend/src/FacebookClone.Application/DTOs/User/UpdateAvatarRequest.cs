using System.ComponentModel.DataAnnotations;

namespace FacebookClone.Application.DTOs.User;

public class UpdateAvatarRequest
{
    [Required(ErrorMessage = "Đường dẫn ảnh không được để trống")]
    public string AvatarUrl { get; set; } = string.Empty;
}