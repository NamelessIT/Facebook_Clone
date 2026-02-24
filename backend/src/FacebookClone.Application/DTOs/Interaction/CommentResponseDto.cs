using FacebookClone.Application.DTOs.User;

namespace FacebookClone.Application.DTOs.Interaction;

public class CommentResponseDto
{
    public Guid Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public Guid? ParentCommentId { get; set; }
    public DateTime CreatedAt { get; set; }
    public UserProfileDto Author { get; set; } = null!;
}