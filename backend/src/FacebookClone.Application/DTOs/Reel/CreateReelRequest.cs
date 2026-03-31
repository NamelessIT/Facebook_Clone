using FacebookClone.Domain.Enums;
using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace FacebookClone.Application.DTOs.Reel;

public class CreateReelRequest
{
    [Required(ErrorMessage = "Vui long chon video de dang Reel.")]
    public IFormFile VideoFile { get; set; } = null!;

    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Caption { get; set; }
    public PostPrivacy Privacy { get; set; } = PostPrivacy.Public;
    public int Duration { get; set; } = 0;
}