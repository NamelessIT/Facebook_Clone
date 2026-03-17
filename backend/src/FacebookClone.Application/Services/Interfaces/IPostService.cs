using FacebookClone.Application.DTOs.Post;

namespace FacebookClone.Application.Services.Interfaces;

public interface IPostService
{
    Task<PostResponseDto> CreatePostAsync(Guid userId, CreatePostRequest request);
    Task<IEnumerable<PostResponseDto>> GetNewsFeedAsync(Guid currentUserId, int pageNumber = 1, int pageSize = 10);
    Task<PostResponseDto> UpdatePostAsync(Guid postId, Guid userId, UpdatePostRequest request);
    Task<bool> DeletePostAsync(Guid postId, Guid userId);
}