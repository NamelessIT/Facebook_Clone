using System.Text.Json;
using FacebookClone.Domain.Constants;

namespace FacebookClone.API.Services;

public sealed class LiveRecordingStorageService(IWebHostEnvironment environment)
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".webm", ".mp4", ".avi"
    };

    private string WebRoot => Path.GetFullPath(environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"));
    private string RecordingRoot => Path.Combine(WebRoot, "uploads", "live-recordings");
    private string ChunkRoot => Path.Combine(RecordingRoot, ".chunks");

    public async Task<LiveRecordingUploadTicket> InitializeAsync(
        Guid liveId, string fileName, string? contentType, long totalSize, int totalChunks,
        CancellationToken cancellationToken = default)
    {
        if (totalSize <= 0 || totalSize > SharedConstants.Live.MaxRecordingSizeBytes)
            throw new ArgumentException($"Bản ghi live phải nhỏ hơn {SharedConstants.Live.MaxRecordingSizeBytes / 1024 / 1024} MB.");

        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension))
            throw new ArgumentException("Bản ghi live chỉ hỗ trợ .webm, .mp4 hoặc .avi.");

        var expectedChunks = (int)Math.Ceiling((double)totalSize / SharedConstants.UploadChunks.DefaultChunkSizeBytes);
        if (totalChunks != expectedChunks)
            throw new ArgumentException("Số lượng chunk không khớp kích thước bản ghi.");

        var uploadId = Guid.NewGuid();
        var directory = UploadDirectory(liveId, uploadId);
        Directory.CreateDirectory(directory);
        var metadata = new UploadMetadata(fileName, contentType ?? "video/webm", extension, totalSize, totalChunks, DateTime.UtcNow);
        await WriteMetadataAsync(directory, metadata, cancellationToken);
        return new LiveRecordingUploadTicket(uploadId, SharedConstants.UploadChunks.DefaultChunkSizeBytes, totalChunks);
    }

    public async Task StoreChunkAsync(
        Guid liveId, Guid uploadId, int chunkIndex, IFormFile chunk,
        CancellationToken cancellationToken = default)
    {
        var directory = UploadDirectory(liveId, uploadId);
        var metadata = await ReadMetadataAsync(directory, cancellationToken);
        if (chunkIndex < 0 || chunkIndex >= metadata.TotalChunks)
            throw new ArgumentException("Chỉ số chunk không hợp lệ.");
        if (chunk.Length <= 0 || chunk.Length > SharedConstants.UploadChunks.MaxChunkSizeBytes)
            throw new ArgumentException("Kích thước chunk không hợp lệ.");

        var expectedLength = chunkIndex == metadata.TotalChunks - 1
            ? metadata.TotalSize - ((long)chunkIndex * SharedConstants.UploadChunks.DefaultChunkSizeBytes)
            : SharedConstants.UploadChunks.DefaultChunkSizeBytes;
        if (chunk.Length != expectedLength)
            throw new ArgumentException("Kích thước chunk không khớp metadata upload.");

        await using (var output = new FileStream(
            ChunkPath(directory, chunkIndex), FileMode.Create, FileAccess.Write, FileShare.None,
            SharedConstants.UploadChunks.DefaultChunkSizeBytes, FileOptions.Asynchronous | FileOptions.SequentialScan))
        {
            await chunk.CopyToAsync(output, cancellationToken);
        }

        await WriteMetadataAsync(directory, metadata with { UpdatedAt = DateTime.UtcNow }, cancellationToken);
    }

    public async Task<string> CompleteAsync(
        Guid liveId, Guid uploadId, CancellationToken cancellationToken = default)
    {
        var directory = UploadDirectory(liveId, uploadId);
        var metadata = await ReadMetadataAsync(directory, cancellationToken);
        var chunkPaths = Enumerable.Range(0, metadata.TotalChunks).Select(index => ChunkPath(directory, index)).ToArray();
        if (chunkPaths.Any(path => !File.Exists(path)) || chunkPaths.Sum(path => new FileInfo(path).Length) != metadata.TotalSize)
            throw new InvalidOperationException("Bản ghi chưa upload đủ tất cả chunk.");

        Directory.CreateDirectory(RecordingRoot);
        var fileName = $"{Guid.NewGuid()}{metadata.Extension}";
        var destination = Path.Combine(RecordingRoot, fileName);
        try
        {
            await using var output = new FileStream(
                destination, FileMode.CreateNew, FileAccess.Write, FileShare.None,
                SharedConstants.UploadChunks.DefaultChunkSizeBytes, FileOptions.Asynchronous | FileOptions.SequentialScan);
            foreach (var chunkPath in chunkPaths)
            {
                await using var input = new FileStream(
                    chunkPath, FileMode.Open, FileAccess.Read, FileShare.Read,
                    SharedConstants.UploadChunks.DefaultChunkSizeBytes, FileOptions.Asynchronous | FileOptions.SequentialScan);
                await input.CopyToAsync(output, SharedConstants.UploadChunks.DefaultChunkSizeBytes, cancellationToken);
            }
        }
        catch
        {
            if (File.Exists(destination)) File.Delete(destination);
            throw;
        }

        Directory.Delete(directory, true);
        RemoveEmptyLiveChunkDirectory(liveId);
        return $"/uploads/live-recordings/{fileName}";
    }

    public void DeleteRecording(string? relativeUrl)
    {
        if (string.IsNullOrWhiteSpace(relativeUrl)) return;
        var normalized = relativeUrl.Replace('/', Path.DirectorySeparatorChar).TrimStart(Path.DirectorySeparatorChar);
        var prefix = $"uploads{Path.DirectorySeparatorChar}live-recordings{Path.DirectorySeparatorChar}";
        if (!normalized.StartsWith(prefix, StringComparison.OrdinalIgnoreCase) || normalized.Contains($"{Path.DirectorySeparatorChar}.chunks{Path.DirectorySeparatorChar}")) return;
        var path = Path.GetFullPath(Path.Combine(WebRoot, normalized));
        if (path.StartsWith(RecordingRoot, StringComparison.OrdinalIgnoreCase) && File.Exists(path)) File.Delete(path);
    }

    public void DeletePendingUploads(Guid liveId)
    {
        var directory = Path.Combine(ChunkRoot, liveId.ToString("N"));
        if (Directory.Exists(directory)) Directory.Delete(directory, true);
    }

    public void DeleteExpiredPendingUploads(DateTime cutoff)
    {
        if (!Directory.Exists(ChunkRoot)) return;
        foreach (var directory in Directory.EnumerateDirectories(ChunkRoot, "*", SearchOption.AllDirectories)
                     .OrderByDescending(path => path.Length))
        {
            if (!Directory.Exists(directory) || Directory.GetLastWriteTimeUtc(directory) > cutoff) continue;
            Directory.Delete(directory, true);
        }
    }

    private string UploadDirectory(Guid liveId, Guid uploadId) =>
        Path.Combine(ChunkRoot, liveId.ToString("N"), uploadId.ToString("N"));

    private static string ChunkPath(string directory, int index) => Path.Combine(directory, $"{index:D5}.part");
    private static string MetadataPath(string directory) => Path.Combine(directory, "upload.json");

    private static async Task WriteMetadataAsync(string directory, UploadMetadata metadata, CancellationToken cancellationToken)
    {
        await File.WriteAllTextAsync(MetadataPath(directory), JsonSerializer.Serialize(metadata), cancellationToken);
        Directory.SetLastWriteTimeUtc(directory, metadata.UpdatedAt);
    }

    private static async Task<UploadMetadata> ReadMetadataAsync(string directory, CancellationToken cancellationToken)
    {
        var path = MetadataPath(directory);
        if (!File.Exists(path)) throw new KeyNotFoundException("Không tìm thấy phiên upload bản ghi.");
        return JsonSerializer.Deserialize<UploadMetadata>(await File.ReadAllTextAsync(path, cancellationToken))
               ?? throw new InvalidOperationException("Metadata upload không hợp lệ.");
    }

    private void RemoveEmptyLiveChunkDirectory(Guid liveId)
    {
        var directory = Path.Combine(ChunkRoot, liveId.ToString("N"));
        if (Directory.Exists(directory) && !Directory.EnumerateFileSystemEntries(directory).Any()) Directory.Delete(directory);
    }

    private sealed record UploadMetadata(
        string FileName, string ContentType, string Extension, long TotalSize, int TotalChunks, DateTime UpdatedAt);
}

public sealed record LiveRecordingUploadTicket(Guid UploadId, int ChunkSizeBytes, int TotalChunks);
