using AutoMapper;
using FacebookClone.Application.DTOs.Post;
using FacebookClone.Application.Services.Interfaces;
using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Interfaces;

namespace FacebookClone.Application.Services.Implementations;

public class PostService : IPostService
{
    private readonly IUserRepository _userRepository;
    private readonly IPostRepository _postRepository;
    private readonly IMapper _mapper;
    private readonly IFileService _fileService;
    private readonly IFriendshipRepository _friendshipRepository;

    public PostService(IPostRepository postRepository, IMapper mapper, IUserRepository userRepository, IFileService fileService, IFriendshipRepository friendshipRepository)
    {
        _postRepository = postRepository;
        _mapper = mapper;
        _userRepository = userRepository;
        _fileService = fileService;
        _friendshipRepository = friendshipRepository;
    }

    public async Task<PostResponseDto> CreatePostAsync(Guid userId, CreatePostRequest request)
    {
        // 👇 THÊM ĐOẠN NÀY ĐỂ CHẶN BÀI RỖNG
        bool hasContent = !string.IsNullOrWhiteSpace(request.Content);
        bool hasImages = request.Images != null && request.Images.Any();
        bool hasVideos = request.Videos != null && request.Videos.Any();

        if (!hasContent && !hasImages && !hasVideos)
        {
            throw new Exception("Bài viết phải có ít nhất nội dung chữ hoặc hình ảnh/video.");
        }
        var post = new Post
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Content = request.Content ?? "",
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

    public async Task<IEnumerable<PostResponseDto>> GetNewsFeedAsync(Guid currentUserId, int pageNumber = 1, int pageSize = 10)
    {
        var friendships = await _friendshipRepository.GetFriendsListAsync(currentUserId);
        var friendIds = friendships
            .Where(f => f.Status == FriendshipStatus.Accepted)
            .Select(f => f.RequesterId == currentUserId ? f.ReceiverId : f.RequesterId)
            .Distinct();

        var posts = await _postRepository.GetNewsFeedAsync(currentUserId, friendIds, pageNumber, pageSize);
        var postDtos = _mapper.Map<IEnumerable<PostResponseDto>>(posts).ToList();

        foreach (var dto in postDtos)
        {
            var originalPost = posts.First(p => p.Id == dto.Id);
            
            // Tính MyReaction cho user hiện tại
            var userReaction = originalPost.Reactions.FirstOrDefault(r => r.UserId == currentUserId);
            dto.MyReaction = userReaction != null ? (int)userReaction.ReactionType : null;

            // 👇 BÍ QUYẾT MỚI LÀ ĐÂY: Lọc Top 3 loại cảm xúc được thả nhiều nhất trên bài này
            dto.TopReactions = originalPost.Reactions
                .GroupBy(r => (int)r.ReactionType)       // Gom nhóm theo loại cảm xúc
                .OrderByDescending(g => g.Count())       // Sắp xếp loại nào nhiều nhất lên đầu
                .Select(g => g.Key)                      // Chỉ lấy cái ID của cảm xúc (1, 2, 3...)
                .Take(3)                                 // Chỉ lấy tối đa 3 loại
                .ToList();
            // Cắt bớt, lấy tên 5 người mới nhất thả cảm xúc
            dto.ReactorNames = originalPost.Reactions
                .OrderByDescending(r => r.CreatedAt) // 👈 Ưu tiên người mới thả lên đầu
                .Select(r => r.User != null ? r.User.FullName : "Người dùng") // 👈 Bọc an toàn chống null
                .Take(5) 
                .ToList();
        }

        return postDtos;
    }

    public async Task<PostResponseDto> UpdatePostAsync(Guid postId, Guid userId, UpdatePostRequest request)
    {
        var post = await _postRepository.GetByIdAsync(postId);
        
        if (post == null) 
            throw new Exception("Bài viết không tồn tại hoặc đã bị xóa.");
            
        if (post.UserId != userId) 
            throw new UnauthorizedAccessException("Bạn không có quyền sửa bài viết của người khác!");

        post.Content = request.Content;
        post.Privacy = request.Privacy;
        post.UpdatedAt = DateTime.UtcNow;

        // Xóa media theo danh sách ID
        if (request.MediasToRemove != null && request.MediasToRemove.Any())
        {
            var mediasToDelete = post.Medias
                .Where(m => request.MediasToRemove.Contains(m.Id))
                .ToList();
            foreach (var media in mediasToDelete)
            {
                post.Medias.Remove(media);
            }
        }

        // Upload ảnh mới
        if (request.NewImages != null && request.NewImages.Any())
        {
            foreach (var img in request.NewImages)
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

        // Upload video mới
        if (request.NewVideos != null && request.NewVideos.Any())
        {
            foreach (var vid in request.NewVideos)
            {
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

        await _postRepository.UpdateAsync(post);
        var updatedPost = await _postRepository.GetByIdAsync(postId);
        return _mapper.Map<PostResponseDto>(updatedPost);
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

    public async Task<PostResponseDto> SharePostAsync(Guid userId, Guid postId, SharePostRequest request)
    {
        var originalPost = await _postRepository.GetByIdAsync(postId);
        if (originalPost == null)
            throw new Exception("Bai viet goc khong ton tai hoac da bi xoa.");

        var sharedPost = new Post
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Content = request.Caption ?? string.Empty,
            Privacy = request.Privacy,
            PostType = PostType.Share,
            SharedPostId = postId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        await _postRepository.CreateAsync(sharedPost);

        var created = await _postRepository.GetByIdAsync(sharedPost.Id);
        return _mapper.Map<PostResponseDto>(created);
    }

    public async Task<(IEnumerable<PostResponseDto> Items, int Total)> GetUserPostsAsync(
        Guid currentUserId, Guid targetUserId, int pageNumber, int pageSize)
    {
        IEnumerable<PostPrivacy> allowedPrivacies;

        if (currentUserId == targetUserId)
        {
            // Xem profile chinh minh → thay tat ca post
            allowedPrivacies = new[] { PostPrivacy.Public, PostPrivacy.Friends, PostPrivacy.Private };
        }
        else
        {
            var friendship = await _friendshipRepository.GetFriendshipAsync(currentUserId, targetUserId);
            bool isFriend = friendship?.Status == FriendshipStatus.Accepted;
            // Ban be: xem Public + Friends; Nguoi la: chi xem Public
            allowedPrivacies = isFriend
                ? new[] { PostPrivacy.Public, PostPrivacy.Friends }
                : new[] { PostPrivacy.Public };
        }

        var (posts, total) = await _postRepository.GetUserPostsAsync(targetUserId, allowedPrivacies, pageNumber, pageSize);
        var dtos = _mapper.Map<IEnumerable<PostResponseDto>>(posts).ToList();

        foreach (var dto in dtos)
        {
            var originalPost = posts.First(p => p.Id == dto.Id);
            var userReaction = originalPost.Reactions.FirstOrDefault(r => r.UserId == currentUserId);
            dto.MyReaction = userReaction != null ? (int)userReaction.ReactionType : null;
            dto.TopReactions = originalPost.Reactions
                .GroupBy(r => (int)r.ReactionType)
                .OrderByDescending(g => g.Count())
                .Select(g => g.Key)
                .Take(3).ToList();
            dto.ReactorNames = originalPost.Reactions
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => r.User != null ? r.User.FullName : "Nguoi dung")
                .Take(5).ToList();
        }

        return (dtos, total);
    }
}