using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace FacebookClone.Application.DTOs.Reel;

public class CreateReelRequest
{
    [Required(ErrorMessage = "Vui lòng chọn video để đăng Reel.")]
    public IFormFile VideoFile { get; set; } = null!; // 👈 Đổi từ string VideoUrl thành IFormFile

    public string? Caption { get; set; }
}