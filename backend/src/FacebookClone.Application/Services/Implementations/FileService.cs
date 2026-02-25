using FacebookClone.Application.Services.Interfaces;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace FacebookClone.Application.Services.Implementations;

public class FileService : IFileService
{
    private readonly IWebHostEnvironment _env;

    public FileService(IWebHostEnvironment env)
    {
        _env = env;
    }

    public async Task<string> UploadImageAsync(IFormFile file, string folderName = "images")
    {
        if (file == null || file.Length == 0)
            throw new ArgumentException("File không hợp lệ.");

        // Kiểm tra định dạng (chỉ cho phép ảnh)
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif" };
        var extension = Path.GetExtension(file.FileName).ToLower();
        if (!allowedExtensions.Contains(extension))
            throw new ArgumentException("Chỉ cho phép upload file ảnh (.jpg, .png, .gif).");

        // Tạo thư mục wwwroot/uploads/{folderName} nếu chưa có
        string uploadsFolder = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", folderName);
        if (!Directory.Exists(uploadsFolder))
            Directory.CreateDirectory(uploadsFolder);

        // Đổi tên file để không bao giờ bị trùng (Dùng GUID)
        string uniqueFileName = Guid.NewGuid().ToString() + extension;
        string filePath = Path.Combine(uploadsFolder, uniqueFileName);

        // Lưu file vào ổ cứng
        using (var fileStream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(fileStream);
        }

        // Trả về đường dẫn tương đối (để lưu vào Database)
        return $"/uploads/{folderName}/{uniqueFileName}";
    }
}