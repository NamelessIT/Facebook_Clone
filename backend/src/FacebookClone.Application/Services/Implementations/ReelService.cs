using AutoMapper;
using FacebookClone.Application.DTOs.Reel;
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
    public ReelService(IReelRepository reelRepo, INotificationService notiService, IMapper mapper, IFileService fileService)
    {
        _reelRepo = reelRepo;
        _notiService = notiService;
        _mapper = mapper;
        _fileService = fileService;
    }

public async Task<ReelResponseDto> CreateReelAsync(Guid userId, CreateReelRequest request)
    {
        // 👇 3. CHẶN DUNG LƯỢNG (Ví dụ: Giới hạn 50MB cho Reel)
        long maxFileSize = 50L * 1024 * 1024; // 50 MB
        if (request.VideoFile.Length > maxFileSize)
        {
            throw new Exception("Dung lượng video Reel quá lớn. Vui lòng chọn video dưới 50MB (khoảng 1 phút 30 giây).");
        }

        // 👇 4. Tự động Upload File lên thư mục "reels" (tách riêng với thư mục videos của Post cho gọn)
        var uploadedUrl = await _fileService.UploadVideoAsync(request.VideoFile, "reels");

        // 5. Tạo Reel lưu vào DB
        var reel = new Reel
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            VideoUrl = uploadedUrl, // 👈 Lấy URL vừa upload nhét vào đây
            Caption = request.Caption,
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        await _reelRepo.AddReelAsync(reel);
        
        var createdReel = await _reelRepo.GetByIdAsync(reel.Id);

        return new ReelResponseDto
        {
            Id = createdReel!.Id,
            VideoUrl = createdReel.VideoUrl,
            Caption = createdReel.Caption,
            CreatedAt = createdReel.CreatedAt,
            LikesCount = 0,
            IsLikedByMe = false,
            Author = _mapper.Map<UserProfileDto>(createdReel.User)
        };
    }

    public async Task<IEnumerable<ReelResponseDto>> GetReelsFeedAsync(Guid currentUserId, int pageNumber, int pageSize)
    {
        var reels = await _reelRepo.GetReelsFeedAsync(pageNumber, pageSize);
        
        return reels.Select(r => new ReelResponseDto
        {
            Id = r.Id,
            VideoUrl = r.VideoUrl,
            Caption = r.Caption,
            CreatedAt = r.CreatedAt,
            LikesCount = r.Likes.Count,
            IsLikedByMe = r.Likes.Any(l => l.UserId == currentUserId), // Kiểm tra xem mình có thả tim không
            Author = _mapper.Map<UserProfileDto>(r.User)
        });
    }

    public async Task<string> ToggleLikeAsync(Guid userId, Guid reelId)
    {
        var reel = await _reelRepo.GetByIdAsync(reelId);
        if (reel == null) throw new Exception("Không tìm thấy Reel.");

        var existingLike = await _reelRepo.GetLikeAsync(reelId, userId);

        if (existingLike == null)
        {
            await _reelRepo.AddLikeAsync(new ReelLike
            {
                ReelId = reelId,
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            });
            
            // Tích hợp hệ thống thông báo "Ting ting" của chúng ta luôn!
            await _notiService.CreateNotificationAsync(reel.UserId, userId, NotificationType.Like, reelId);
            
            return "Đã thả tim Reel.";
        }
        else
        {
            await _reelRepo.RemoveLikeAsync(existingLike);
            return "Đã bỏ tim Reel.";
        }
    }
}