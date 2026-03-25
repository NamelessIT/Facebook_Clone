namespace FacebookClone.Application.DTOs.Search;

public class SearchUserDto
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
}
