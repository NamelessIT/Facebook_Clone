using FacebookClone.Domain.Enums;

namespace FacebookClone.Application.DTOs.Interaction;

public class ReactionRequest
{
    public ReactionType ReactionType { get; set; } = ReactionType.Like;
}