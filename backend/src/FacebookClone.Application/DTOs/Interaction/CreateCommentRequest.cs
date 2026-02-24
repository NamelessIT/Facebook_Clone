using System.ComponentModel.DataAnnotations;

namespace FacebookClone.Application.DTOs.Interaction;

public class CreateCommentRequest
{
    [Required(ErrorMessage = "Bình luận không được để trống")]
    public string Content { get; set; } = string.Empty;

    // Dùng khi người dùng bấm "Trả lời" (Reply) một bình luận khác
    public Guid? ParentCommentId { get; set; } 
}