using FacebookClone.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting; // Thêm using này ở đầu file

namespace FacebookClone.API.Controllers;

[Route("api/v1/[controller]")]
[ApiController]
[Authorize] // Phải đăng nhập mới được upload
public class MediaController : ControllerBase
{
    private readonly IFileService _fileService;

    public MediaController(IFileService fileService)
    {
        _fileService = fileService;
    }

    [HttpPost("upload-image")]
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        try
        {
            var fileUrl = await _fileService.UploadImageAsync(file, "avatars");
            return Ok(new { success = true, url = fileUrl, message = "Upload ảnh thành công!" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("upload-video")]
    [DisableRequestSizeLimit] // 👈 Vô hiệu hóa giới hạn 30MB mặc định của Kestrel
    [RequestFormLimits(ValueLengthLimit = int.MaxValue, MultipartBodyLengthLimit = int.MaxValue)] // 👈 Cho phép Form gửi file siêu to
    // [RequestSizeLimit(52428800)] // Bật dòng này nếu .NET chặn file lớn (50MB)
    public async Task<IActionResult> UploadVideo(IFormFile file)
    {
        try
        {
            var fileUrl = await _fileService.UploadVideoAsync(file, "videos");
            return Ok(new { success = true, url = fileUrl, message = "Upload video thành công!" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // Lưu ý: Không dùng [Authorize] ở đây vì thẻ <video> trong HTML thường gặp khó khăn khi truyền JWT qua header.
    // Nếu muốn bảo mật, thường dùng Query String Token (?token=xxx) hoặc Cookie.
    [AllowAnonymous]
    [HttpGet("stream/{*fileName}")]
    public IActionResult StreamVideo(string fileName)
    {
        var _env = HttpContext.RequestServices.GetRequiredService<IWebHostEnvironment>();
        
        // Trỏ đường dẫn tới file video
        var filePath = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", "videos", fileName);

        if (!System.IO.File.Exists(filePath))
            return NotFound("Video không tồn tại.");

        // BÍ MẬT NẰM Ở ĐÂY: enableRangeProcessing = true
        // Nó cho phép trình duyệt gửi header "Range: bytes=0-1024" và C# sẽ chỉ trả về đúng đoạn đó
        return PhysicalFile(filePath, "video/mp4", enableRangeProcessing: true);
    }
}