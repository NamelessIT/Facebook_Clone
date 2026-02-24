using AutoMapper;
using FacebookClone.Application.DTOs.Post;
using FacebookClone.Application.Services.Interfaces;
using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Interfaces;

namespace FacebookClone.Application.Services.Implementations;

public class PostService : IPostService
{
    private readonly IUserRepository _userRepository;
    private readonly IPostRepository _postRepository;
    private readonly IMapper _mapper;

    public PostService(IPostRepository postRepository, IMapper mapper,IUserRepository userRepository)
    {
        _postRepository = postRepository;
        _mapper = mapper;
        _userRepository = userRepository;
    }

    public async Task<PostResponseDto> CreatePostAsync(Guid userId, CreatePostRequest request)
    {
        var post = new Post
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Content = request.Content,
            Privacy = request.Privacy,
            PostType = request.PostType,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        var createdPost = await _postRepository.CreateAsync(post);

        var user = await _userRepository.GetByIdAsync(userId);
        createdPost.User = user!;
        return _mapper.Map<PostResponseDto>(createdPost);
    }

    public async Task<IEnumerable<PostResponseDto>> GetNewsFeedAsync(int pageNumber = 1, int pageSize = 10)
    {
        var posts = await _postRepository.GetNewsFeedAsync(pageNumber, pageSize);
        return _mapper.Map<IEnumerable<PostResponseDto>>(posts);
    }

    public async Task<PostResponseDto> UpdatePostAsync(Guid postId, Guid userId, UpdatePostRequest request)
    {
        var post = await _postRepository.GetByIdAsync(postId);
        
        if (post == null) 
            throw new Exception("Bài viết không tồn tại hoặc đã bị xóa.");
            
        if (post.UserId != userId) 
            throw new UnauthorizedAccessException("Bạn không có quyền sửa bài viết của người khác!");

        // Cập nhật thông tin
        post.Content = request.Content;
        post.Privacy = request.Privacy;
        post.UpdatedAt = DateTime.UtcNow;

        await _postRepository.UpdateAsync(post);
        return _mapper.Map<PostResponseDto>(post);
    }

    public async Task<bool> DeletePostAsync(Guid postId, Guid userId)
    {
        var post = await _postRepository.GetByIdAsync(postId);
        
        if (post == null) 
            throw new Exception("Bài viết không tồn tại hoặc đã bị xóa.");
            
        if (post.UserId != userId) 
            throw new UnauthorizedAccessException("Bạn không có quyền xóa bài viết của người khác!");

        // Xóa mềm (Soft Delete)
        post.IsDeleted = true;
        post.UpdatedAt = DateTime.UtcNow;

        await _postRepository.UpdateAsync(post);
        return true;
    }
}