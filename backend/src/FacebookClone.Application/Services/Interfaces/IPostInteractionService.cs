using FacebookClone.Application.DTOs.Post;

namespace FacebookClone.Application.Services.Interfaces;

public interface IPostInteractionService
{
    Task<PostInteractionResponse> AddInteractionAsync(Guid userId, Guid postId, string type);
    Task RemoveInteractionAsync(Guid userId, Guid postId, string type);
    Task<PostInteractionResponse> ReportPostAsync(Guid userId, Guid postId, string reason);
    Task<bool> IsPostSavedAsync(Guid userId, Guid postId);
    Task<(IEnumerable<object> Items, int Total)> GetUserSavedPostsAsync(Guid userId, int page, int pageSize);
}
