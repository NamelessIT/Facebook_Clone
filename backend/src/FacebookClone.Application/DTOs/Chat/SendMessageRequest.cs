using FacebookClone.Domain.Enums;
using System.ComponentModel.DataAnnotations;

namespace FacebookClone.Application.DTOs.Chat;

public class SendMessageRequest
{
    // Nếu chat trong phòng đã có sẵn
    public Guid? ConversationId { get; set; } 
    
    // Nếu tạo phòng chat 1-1 mới với người này
    public Guid? ReceiverId { get; set; } 

    [Required(ErrorMessage = "Tin nhắn không được để trống")]
    public string Content { get; set; } = string.Empty;

    public MessageType MessageType { get; set; } = MessageType.Text;
}