using System.ComponentModel.DataAnnotations;

namespace FacebookClone.Application.DTOs.Post;

public class PostInteractionRequest
{
    [Required]
    public string InteractionType { get; set; } = null!;

    public string? ReportReason { get; set; }
}
