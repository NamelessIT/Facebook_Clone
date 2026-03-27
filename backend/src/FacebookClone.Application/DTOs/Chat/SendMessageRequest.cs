using FacebookClone.Domain.Enums;
using System.ComponentModel.DataAnnotations;

namespace FacebookClone.Application.DTOs.Chat;

public class SendMessageRequest : IValidatableObject
{
    // Nếu chat trong phòng đã có sẵn
    public Guid? ConversationId { get; set; } 
    
    // Nếu tạo phòng chat 1-1 mới với người này
    public Guid? ReceiverId { get; set; } 

    [Required(ErrorMessage = "Tin nhắn không được để trống")]
    public string Content { get; set; } = string.Empty;

    public MessageType MessageType { get; set; } = MessageType.Text;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!ConversationId.HasValue && !ReceiverId.HasValue)
        {
            yield return new ValidationResult(
                "Vui lòng cung cấp ConversationId hoặc ReceiverId.",
                new[] { nameof(ConversationId), nameof(ReceiverId) });
        }
    }
}