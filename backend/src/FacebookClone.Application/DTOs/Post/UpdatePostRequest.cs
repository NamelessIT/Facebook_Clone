using FacebookClone.Domain.Enums;
using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace FacebookClone.Application.DTOs.Post;

public class UpdatePostRequest
{
    [Required(ErrorMessage = "Nội dung bài viết không được để trống")]
    public string Content { get; set; } = string.Empty;

    public PostPrivacy Privacy { get; set; }

    public List<Guid>? MediasToRemove { get; set; }

    public List<IFormFile>? NewImages { get; set; }

    public List<IFormFile>? NewVideos { get; set; }
}