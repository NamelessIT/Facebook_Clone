using FacebookClone.Domain.Enums;
using System.ComponentModel.DataAnnotations;

namespace FacebookClone.Application.DTOs.Post;

public class UpdatePostRequest
{
    [Required(ErrorMessage = "Nội dung bài viết không được để trống")]
    public string Content { get; set; } = string.Empty;

    public PostPrivacy Privacy { get; set; }
}