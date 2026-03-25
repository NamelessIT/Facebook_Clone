using FacebookClone.Application.DTOs.Post;
using FacebookClone.Application.DTOs.Search;

namespace FacebookClone.Application.Services.Interfaces;

public interface ISearchService
{
    Task<(IEnumerable<SearchUserDto> Items, int Total)> SearchUsersAsync(string query, int pageNumber, int pageSize);
    Task<(IEnumerable<PostResponseDto> Items, int Total)> SearchPostsAsync(string query, int pageNumber, int pageSize);
}
