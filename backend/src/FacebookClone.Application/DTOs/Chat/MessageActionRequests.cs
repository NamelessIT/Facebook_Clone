using System.ComponentModel.DataAnnotations;

namespace FacebookClone.Application.DTOs.Chat;

public class EditMessageRequest
{
    [Required]
    [StringLength(2000, MinimumLength = 1)]
    public string Content { get; set; } = string.Empty;
}

public class ForwardMessageRequest
{
    public Guid? ConversationId { get; set; }
    public Guid? ReceiverId { get; set; }
}

public class PinMessageRequest
{
    public bool IsPinned { get; set; }
}

public class MessageMutationResponseDto
{
    public Guid MessageId { get; set; }
    public Guid ConversationId { get; set; }
    public MessageResponseDto? Message { get; set; }
    public bool IsRecalled { get; set; }
    public bool IsPinned { get; set; }
}
