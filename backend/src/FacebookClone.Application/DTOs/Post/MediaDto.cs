using FacebookClone.Domain.Enums;

namespace FacebookClone.Application.DTOs.Post;

public class MediaDto
{
    public Guid Id { get; set; }
    public string Url { get; set; } = null!;
    public MediaType MediaType { get; set; } // Image hay Video
}