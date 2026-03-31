using AutoMapper;
using FacebookClone.Application.DTOs.Post;
using FacebookClone.Application.DTOs.Search;
using FacebookClone.Application.Services.Interfaces;
using FacebookClone.Domain.Interfaces;

namespace FacebookClone.Application.Services.Implementations;

public class SearchService : ISearchService
{
    private readonly IUserRepository _userRepository;
    private readonly IPostRepository _postRepository;
    private readonly IMapper _mapper;

    public SearchService(IUserRepository userRepository, IPostRepository postRepository, IMapper mapper)
    {
        _userRepository = userRepository;
        _postRepository = postRepository;
        _mapper = mapper;
    }

    public async Task<(IEnumerable<SearchUserDto> Items, int Total)> SearchUsersAsync(string query, int pageNumber, int pageSize)
    {
        query = query ?? "";
        
        var (users, total) = await _userRepository.SearchAsync(query, pageNumber, pageSize);
        var dtos = users.Select(u => new SearchUserDto
        {
            Id = u.Id,
            FullName = u.FullName,
            AvatarUrl = u.AvatarUrl,
            Bio = u.Bio
        });

        return (dtos, total);
    }

    public async Task<(IEnumerable<PostResponseDto> Items, int Total)> SearchPostsAsync(string query, int pageNumber, int pageSize)
    {
        if (string.IsNullOrWhiteSpace(query))
            return (Enumerable.Empty<PostResponseDto>(), 0);

        var (posts, total) = await _postRepository.SearchAsync(query, pageNumber, pageSize);
        var dtos = _mapper.Map<IEnumerable<PostResponseDto>>(posts);

        return (dtos, total);
    }
}
