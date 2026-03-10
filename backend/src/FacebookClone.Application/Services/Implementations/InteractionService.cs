using AutoMapper;
using FacebookClone.Application.DTOs.Interaction;
using FacebookClone.Application.Services.Interfaces;
using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Interfaces;
using FacebookClone.Domain.Enums; 

namespace FacebookClone.Application.Services.Implementations;

public class InteractionService : IInteractionService
{
    private readonly IInteractionRepository _interactionRepo;
    private readonly IPostRepository _postRepo;
    private readonly IUserRepository _userRepo;
    private readonly IMapper _mapper;
    private readonly INotificationService _notiService;

    public InteractionService(IInteractionRepository interactionRepo, IPostRepository postRepo, IUserRepository userRepo, IMapper mapper,INotificationService notiService)
    {
        _interactionRepo = interactionRepo;
        _postRepo = postRepo;
        _userRepo = userRepo;
        _mapper = mapper;
        _notiService = notiService;
    }

    public async Task<string> ToggleReactionAsync(Guid userId, Guid postId, ReactionRequest request)
    {
        var post = await _postRepo.GetByIdAsync(postId);
        if (post == null) throw new Exception("Bài viết không tồn tại.");

        var existingReaction = await _interactionRepo.GetReactionAsync(userId, postId);

        if (existingReaction == null)
        {
            // 1. Chưa thả -> Thêm mới
            await _interactionRepo.AddReactionAsync(new Reaction
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                PostId = postId,
                ReactionType = request.ReactionType,
                CreatedAt = DateTime.UtcNow
            });
            // 👇 THÊM DÒNG NÀY: Thông báo cho chủ bài viết là có người Thả cảm xúc            
            await _notiService.CreateNotificationAsync(post.UserId, userId, NotificationType.Like, postId);
            return "Đã bày tỏ cảm xúc.";
        }
        else if (existingReaction.ReactionType == request.ReactionType)
        {
            // 2. Thả y hệt -> Hủy cảm xúc (Unlike)
            await _interactionRepo.DeleteReactionAsync(existingReaction);
            return "Đã gỡ cảm xúc.";
        }
        else
        {
            // 3. Đổi cảm xúc (Từ Like sang Haha)
            existingReaction.ReactionType = request.ReactionType;
            await _interactionRepo.UpdateReactionAsync(existingReaction);
            return "Đã thay đổi cảm xúc.";
        }
    }

    public async Task<CommentResponseDto> AddCommentAsync(Guid userId, Guid postId, CreateCommentRequest request)
    {
        var post = await _postRepo.GetByIdAsync(postId);
        if (post == null) throw new Exception("Bài viết không tồn tại.");

        var comment = new Comment
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            PostId = postId,
            Content = request.Content,
            ParentCommentId = request.ParentCommentId,
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        await _interactionRepo.AddCommentAsync(comment);

        // Kéo thêm thông tin User để trả về DTO khỏi bị lỗi Author = null
        var user = await _userRepo.GetByIdAsync(userId);
        comment.User = user!;

        // 👇 THÊM DÒNG NÀY: Thông báo cho chủ bài viết là có người Bình luận
        await _notiService.CreateNotificationAsync(post.UserId, userId, NotificationType.Comment, postId);
        return _mapper.Map<CommentResponseDto>(comment);
    }

    public async Task<IEnumerable<CommentResponseDto>> GetCommentsAsync(Guid postId, int pageNumber, int pageSize)
    {
        var comments = await _interactionRepo.GetCommentsByPostIdAsync(postId, pageNumber, pageSize);
        return _mapper.Map<IEnumerable<CommentResponseDto>>(comments);
    }

    // 👇 THÊM HÀM NÀY ĐỂ XỬ LÝ THẢ TIM COMMENT
    public async Task<string> ToggleCommentReactionAsync(Guid userId, Guid commentId, ReactionRequest request)
    {
        // 1. Kiểm tra comment có tồn tại không (Phải lấy thêm thông tin để bắn Noti)
        var comment = await _interactionRepo.GetCommentByIdAsync(commentId);
        if (comment == null) throw new Exception("Bình luận không tồn tại.");

        // 2. Kiểm tra xem user đã thả tim comment này chưa
        var existingReaction = await _interactionRepo.GetCommentReactionAsync(userId, commentId);

        if (existingReaction == null)
        {
            // 3. Chưa thả -> Thêm mới
            await _interactionRepo.AddReactionAsync(new Reaction
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                PostId = null, // 👈 ĐỂ TRỐNG POST ID
                CommentId = commentId, // 👈 GẮN COMMENT ID VÀO
                ReactionType = request.ReactionType,
                CreatedAt = DateTime.UtcNow
            });
            
            // Thông báo cho chủ bình luận là có người thả tim vào bình luận của họ
            await _notiService.CreateNotificationAsync(comment.UserId, userId, NotificationType.Like, comment.PostId);
            return "Đã bày tỏ cảm xúc với bình luận.";
        }
        else if (existingReaction.ReactionType == request.ReactionType)
        {
            // 4. Thả y hệt -> Hủy cảm xúc (Unlike)
            await _interactionRepo.DeleteReactionAsync(existingReaction);
            return "Đã gỡ cảm xúc bình luận.";
        }
        else
        {
            // 5. Đổi cảm xúc (Từ Like sang Haha)
            existingReaction.ReactionType = request.ReactionType;
            await _interactionRepo.UpdateReactionAsync(existingReaction);
            return "Đã thay đổi cảm xúc bình luận.";
        }
    }
}