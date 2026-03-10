using AutoMapper;
using FacebookClone.Application.DTOs.Post;
using FacebookClone.Application.Services.Interfaces;
using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums; // 👈 1. Đã thêm using Enums
using FacebookClone.Domain.Interfaces;

namespace FacebookClone.Application.Services.Implementations;

public class PostService : IPostService
{
    private readonly IUserRepository _userRepository;
    private readonly IPostRepository _postRepository;
    private readonly IMapper _mapper;
    private readonly IFileService _fileService; // 👈 2. Đã thêm IFileService

    // 👇 3. Đã inject IFileService vào Constructor
    public PostService(IPostRepository postRepository, IMapper mapper, IUserRepository userRepository, IFileService fileService)
    {
        _postRepository = postRepository;
        _mapper = mapper;
        _userRepository = userRepository;
        _fileService = fileService; 
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
            IsDeleted = false
        };

        // 1. Xử lý lưu danh sách ẢNH
        if (request.Images != null && request.Images.Any())
        {
            foreach (var img in request.Images)
            {
                var imgUrl = await _fileService.UploadImageAsync(img, "posts");
                post.Medias.Add(new MediaAttachment 
                { 
                    Id = Guid.NewGuid(),
                    Url = imgUrl, 
                    MediaType = MediaType.Image, 
                    CreatedAt = DateTime.UtcNow 
                });
            }
        }

        // 2. Xử lý lưu danh sách VIDEO
        if (request.Videos != null && request.Videos.Any())
        {
            foreach (var vid in request.Videos)
            {
                // Gọi hàm UploadVideoAsync mà chúng ta đã làm ở phần Reels
                var vidUrl = await _fileService.UploadVideoAsync(vid, "posts"); 
                post.Medias.Add(new MediaAttachment 
                { 
                    Id = Guid.NewGuid(),
                    Url = vidUrl, 
                    MediaType = MediaType.Video, 
                    CreatedAt = DateTime.UtcNow 
                });
            }
        }

        // 👇 4. Đã sửa _postRepo thành _postRepository
        await _postRepository.CreateAsync(post);
        var createdPost = await _postRepository.GetByIdAsync(post.Id);

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