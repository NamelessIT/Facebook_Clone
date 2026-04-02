namespace FacebookClone.Application.DTOs.User;

public class UserProfileDto
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName => $"{FirstName} {LastName}".Trim();
    public string? AvatarUrl { get; set; }
    public string? CoverUrl { get; set; }
    public string? Bio { get; set; }
    public string? Location { get; set; }
    public bool IsOnline { get; set; }
    public DateTime CreatedAt { get; set; }
}