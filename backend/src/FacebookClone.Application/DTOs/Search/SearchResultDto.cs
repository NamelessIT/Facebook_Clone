using FacebookClone.Application.DTOs.Post;

namespace FacebookClone.Application.DTOs.Search;

public class SearchResultDto
{
    public IEnumerable<SearchUserDto> Users { get; set; } = Enumerable.Empty<SearchUserDto>();
    public IEnumerable<PostResponseDto> Posts { get; set; } = Enumerable.Empty<PostResponseDto>();
}
