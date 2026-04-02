using FacebookClone.Domain.Enums;
using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace FacebookClone.Application.DTOs.Post;

public class UpdatePostRequest
{
    [StringLength(5000)]
    public string? Content { get; set; }

    public PostPrivacy? Privacy { get; set; }

    public List<Guid>? MediasToRemove { get; set; }

    public List<IFormFile>? NewImages { get; set; }

    public List<IFormFile>? NewVideos { get; set; }
}