using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace FacebookClone.Application.DTOs.User;

public class UpdateProfileFormRequest
{
    [MaxLength(50)]
    public string? FirstName { get; set; }

    [MaxLength(50)]
    public string? LastName { get; set; }

    [MaxLength(500)]
    public string? Bio { get; set; }

    [MaxLength(100)]
    public string? Location { get; set; }

    public IFormFile? Avatar { get; set; }

    public IFormFile? Cover { get; set; }
}