using FacebookClone.Application.DTOs.Interaction;

namespace FacebookClone.Application.Services.Interfaces;

public interface IInteractionService
{
    Task<string> ToggleReactionAsync(Guid userId, Guid postId, ReactionRequest request);
    Task<CommentResponseDto> AddCommentAsync(Guid userId, Guid postId, CreateCommentRequest request);
    Task<IEnumerable<CommentResponseDto>> GetCommentsAsync(Guid postId, int pageNumber, int pageSize);
}