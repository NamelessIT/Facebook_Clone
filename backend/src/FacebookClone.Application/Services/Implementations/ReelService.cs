using AutoMapper;
using FacebookClone.Application.DTOs.Reel;
using FacebookClone.Application.DTOs.Interaction;
using FacebookClone.Application.DTOs.User;
using FacebookClone.Application.Services.Interfaces;
using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Interfaces;

namespace FacebookClone.Application.Services.Implementations;

public class ReelService : IReelService
{
    private readonly IReelRepository _reelRepo;
    private readonly INotificationService _notiService;
    private readonly IMapper _mapper;
    private readonly IFileService _fileService;
    private readonly IUserBlockRepository _userBlockRepository;

    public ReelService(IReelRepository reelRepo, INotificationService notiService,
        IMapper mapper, IFileService fileService, IUserBlockRepository userBlockRepository)
    {
        _reelRepo = reelRepo;
        _notiService = notiService;
        _mapper = mapper;
        _fileService = fileService;
        _userBlockRepository = userBlockRepository;
    }

    private ReelResponseDto MapToDto(Reel r, Guid currentUserId) => new()
    {
        Id = r.Id,
        VideoUrl = r.VideoUrl,
        ThumbnailUrl = r.ThumbnailUrl,
        Title = r.Title,
        Description = r.Description,
        Caption = r.Caption,
        Privacy = r.Privacy,
        Duration = r.Duration,
        ViewsCount = r.ViewsCount,
        LikesCount = r.Likes?.Count ?? 0,
        CommentsCount = r.Comments?.Count(comment => !comment.IsDeleted) ?? 0,
        IsLikedByMe = r.Likes?.Any(l => l.UserId == currentUserId) ?? false,
        CreatedAt = r.CreatedAt,
        Author = _mapper.Map<UserProfileDto>(r.User)
    };

    public async Task<ReelResponseDto> CreateReelAsync(Guid userId, CreateReelRequest request)
    {
        long maxBytes = 100L * 1024 * 1024;
        if (request.VideoFile.Length > maxBytes)
            throw new Exception("Dung luong video qua lon. Gioi han 100MB.");

        var videoUrl = await _fileService.UploadVideoAsync(request.VideoFile, "reels");

        var reel = new Reel
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            VideoUrl = videoUrl,
            Title = request.Title,
            Description = request.Description,
            Caption = request.Caption,
            Privacy = request.Privacy,
            Duration = request.Duration,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        await _reelRepo.AddReelAsync(reel);
        var created = await _reelRepo.GetByIdAsync(reel.Id);
        return MapToDto(created!, userId);
    }

    public async Task<(IEnumerable<ReelResponseDto> Items, int Total)> GetReelsFeedAsync(
        Guid currentUserId, int pageNumber, int pageSize)
    {
        var reels = await _reelRepo.GetReelsFeedAsync(pageNumber, pageSize);
        var list = new List<Reel>();
        foreach (var reel in reels)
            if (reel.UserId == currentUserId || !await _userBlockRepository.IsFullyBlockedBetweenAsync(currentUserId, reel.UserId)) list.Add(reel);
        return (list.Select(r => MapToDto(r, currentUserId)), list.Count);
    }

    public async Task<(IEnumerable<ReelResponseDto> Items, int Total)> GetUserReelsAsync(
        Guid currentUserId, Guid targetUserId, int pageNumber, int pageSize)
    {
        if (currentUserId != targetUserId && await _userBlockRepository.IsFullyBlockedBetweenAsync(currentUserId, targetUserId))
            return (Array.Empty<ReelResponseDto>(), 0);
        var (reels, total) = await _reelRepo.GetUserReelsAsync(targetUserId, pageNumber, pageSize);
        var filtered = currentUserId == targetUserId
            ? reels
            : reels.Where(r => r.Privacy != PostPrivacy.Private);
        return (filtered.Select(r => MapToDto(r, currentUserId)), total);
    }

    public async Task<ReelResponseDto> GetReelAsync(Guid currentUserId, Guid reelId)
    {
        var reel = await _reelRepo.GetByIdAsync(reelId);
        if (reel == null) throw new Exception("Reel khong ton tai hoac da bi xoa.");
        if (reel.UserId != currentUserId && await _userBlockRepository.IsFullyBlockedBetweenAsync(currentUserId, reel.UserId))
            throw new UnauthorizedAccessException("Nội dung không khả dụng do thiết lập chặn.");
        if (reel.Privacy == PostPrivacy.Private && reel.UserId != currentUserId)
            throw new UnauthorizedAccessException("Ban khong co quyen xem Reel nay.");
        return MapToDto(reel, currentUserId);
    }

    public async Task<ReelResponseDto> UpdateReelAsync(Guid userId, Guid reelId, UpdateReelRequest request)
    {
        var reel = await _reelRepo.GetByIdAsync(reelId);
        if (reel == null) throw new Exception("Reel khong ton tai.");
        if (reel.UserId != userId) throw new UnauthorizedAccessException("Ban khong co quyen sua Reel nay.");

        if (request.Title != null) reel.Title = request.Title;
        if (request.Description != null) reel.Description = request.Description;
        if (request.Caption != null) reel.Caption = request.Caption;
        if (request.Privacy.HasValue) reel.Privacy = request.Privacy.Value;
        reel.UpdatedAt = DateTime.UtcNow;

        await _reelRepo.UpdateAsync(reel);
        var updated = await _reelRepo.GetByIdAsync(reelId);
        return MapToDto(updated!, userId);
    }

    public async Task DeleteReelAsync(Guid userId, Guid reelId)
    {
        var reel = await _reelRepo.GetByIdAsync(reelId);
        if (reel == null) throw new Exception("Reel khong ton tai.");
        if (reel.UserId != userId) throw new UnauthorizedAccessException("Ban khong co quyen xoa Reel nay.");

        reel.IsDeleted = true;
        reel.UpdatedAt = DateTime.UtcNow;
        await _reelRepo.UpdateAsync(reel);
    }

    public async Task<ToggleLikeResultDto> ToggleLikeAsync(Guid userId, Guid reelId)
    {
        var reel = await _reelRepo.GetByIdAsync(reelId);
        if (reel == null) throw new Exception("Reel khong ton tai.");

        var existingLike = await _reelRepo.GetLikeAsync(reelId, userId);
        bool isLiked;
        string message;

        if (existingLike == null)
        {
            await _reelRepo.AddLikeAsync(new ReelLike
            {
                ReelId = reelId,
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            });
            if (reel.UserId != userId)
                await _notiService.CreateNotificationAsync(reel.UserId, userId, NotificationType.Like, reelId);
            isLiked = true;
            message = "Da like Reel.";
        }
        else
        {
            await _reelRepo.RemoveLikeAsync(existingLike);
            isLiked = false;
            message = "Da bo like Reel.";
        }

        int likesCount = await _reelRepo.CountLikesAsync(reelId);
        return new ToggleLikeResultDto(isLiked, likesCount, message);
    }

    public async Task<(IEnumerable<CommentResponseDto> Items, int Total)> GetCommentsAsync(
        Guid currentUserId, Guid reelId, int pageNumber, int pageSize)
    {
        await GetReelAsync(currentUserId, reelId);
        var comments = await _reelRepo.GetCommentsAsync(reelId, pageNumber, pageSize);
        var total = await _reelRepo.CountCommentsAsync(reelId);
        return (comments.Select(MapCommentToDto), total);
    }

    public async Task<CommentResponseDto> AddCommentAsync(Guid userId, Guid reelId, CreateCommentRequest request)
    {
        var reel = await _reelRepo.GetByIdAsync(reelId);
        if (reel == null) throw new Exception("Reel không tồn tại hoặc đã bị xóa.");
        if (reel.UserId != userId && await _userBlockRepository.IsFullyBlockedBetweenAsync(userId, reel.UserId))
            throw new UnauthorizedAccessException("Không thể bình luận do thiết lập chặn.");

        var content = request.Content?.Trim();
        if (string.IsNullOrWhiteSpace(content)) throw new Exception("Bình luận không được để trống.");
        if (content.Length > 1000) throw new Exception("Bình luận không được vượt quá 1000 ký tự.");

        var comment = new ReelComment
        {
            Id = Guid.NewGuid(),
            ReelId = reelId,
            UserId = userId,
            Content = content,
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        };
        await _reelRepo.AddCommentAsync(comment);

        var saved = await _reelRepo.GetCommentAsync(reelId, comment.Id)
            ?? throw new Exception("Không thể tải bình luận Reel vừa tạo.");
        if (reel.UserId != userId)
            await _notiService.CreateNotificationAsync(reel.UserId, userId, NotificationType.Comment, reelId);
        return MapCommentToDto(saved);
    }

    private CommentResponseDto MapCommentToDto(ReelComment comment) => new()
    {
        Id = comment.Id,
        Content = comment.Content,
        CreatedAt = comment.CreatedAt,
        Author = _mapper.Map<UserProfileDto>(comment.User)
    };
}
