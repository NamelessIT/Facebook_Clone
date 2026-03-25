using FacebookClone.Domain.Enums;

namespace FacebookClone.Application.DTOs.Post;

public class SharePostRequest
{
    public string? Caption { get; set; }
    public PostPrivacy Privacy { get; set; } = PostPrivacy.Public;
}
