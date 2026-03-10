using FacebookClone.Domain.Enums;
using Microsoft.AspNetCore.Http; // 👈 Thêm thư viện này để dùng IFormFile
using System.ComponentModel.DataAnnotations;

namespace FacebookClone.Application.DTOs.Post;

public class CreatePostRequest
{
    [Required(ErrorMessage = "Nội dung bài viết không được để trống")]
    public string Content { get; set; } = string.Empty;

    public PostPrivacy Privacy { get; set; } = PostPrivacy.Public;
    
    public PostType PostType { get; set; } = PostType.Normal;
    
    // 👇 THÊM 2 LIST NÀY ĐỂ NHẬN VÔ HẠN ẢNH VÀ VIDEO
    public List<IFormFile>? Images { get; set; }
    public List<IFormFile>? Videos { get; set; }
}