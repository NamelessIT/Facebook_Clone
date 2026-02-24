using FacebookClone.Domain.Enums;
using System.ComponentModel.DataAnnotations;

namespace FacebookClone.Application.DTOs.Post;

public class CreatePostRequest
{
    [Required(ErrorMessage = "Nội dung bài viết không được để trống")]
    public string Content { get; set; } = string.Empty;

    public PostPrivacy Privacy { get; set; } = PostPrivacy.Public;
    
    public PostType PostType { get; set; } = PostType.Normal; // Mặc định là bài viết bình thường. Tạm thời chưa làm tính năng Group hay Share, nên ta chỉ cần 3 field trên
    
    // Tạm thời chưa làm tính năng Group hay Share, nên ta chỉ cần 3 field trên
}