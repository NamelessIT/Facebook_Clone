using Microsoft.AspNetCore.Http;

namespace FacebookClone.Application.Services.Interfaces;

public interface IFileService
{
    Task<string> UploadImageAsync(IFormFile file, string folderName = "images");
    Task<string> UploadVideoAsync(IFormFile file, string folderName = "videos");
}