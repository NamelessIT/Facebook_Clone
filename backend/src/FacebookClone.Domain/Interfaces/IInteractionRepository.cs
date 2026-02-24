using FacebookClone.Domain.Entities;

namespace FacebookClone.Domain.Interfaces;

public interface IInteractionRepository
{
    // Reaction
    Task<Reaction?> GetReactionAsync(Guid userId, Guid postId);
    Task AddReactionAsync(Reaction reaction);
    Task UpdateReactionAsync(Reaction reaction);
    Task DeleteReactionAsync(Reaction reaction);

    // Comment
    Task AddCommentAsync(Comment comment);
    Task<IEnumerable<Comment>> GetCommentsByPostIdAsync(Guid postId, int pageNumber, int pageSize);
}