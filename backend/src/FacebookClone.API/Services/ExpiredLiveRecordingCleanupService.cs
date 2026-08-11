using FacebookClone.Infrastructure;
using FacebookClone.Domain.Constants;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.API.Services;

public class ExpiredLiveRecordingCleanupService(
    IServiceScopeFactory scopeFactory,
    IWebHostEnvironment env,
    ILogger<ExpiredLiveRecordingCleanupService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(SharedConstants.Live.CleanupIntervalSeconds));
        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var now = DateTime.UtcNow;
                var expired = await db.LiveSessions
                    .Where(x => x.ConvertedPostId == null && x.RecordingUrl != null && x.RecordingExpiresAt <= now)
                    .ToListAsync(stoppingToken);
                foreach (var live in expired)
                {
                    DeletePhysicalFile(live.RecordingUrl!);
                    live.RecordingUrl = null;
                    live.RecordingExpiresAt = null;
                    live.UpdatedAt = now;
                }
                if (expired.Count > 0) await db.SaveChangesAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
            catch (Exception ex) { logger.LogError(ex, "Failed to clean expired live recordings."); }
        }
    }

    private void DeletePhysicalFile(string relativeUrl)
    {
        var normalized = relativeUrl.Replace('/', Path.DirectorySeparatorChar).TrimStart(Path.DirectorySeparatorChar);
        var prefix = $"uploads{Path.DirectorySeparatorChar}live-recordings{Path.DirectorySeparatorChar}";
        if (!normalized.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) return;
        var root = Path.GetFullPath(env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"));
        var path = Path.GetFullPath(Path.Combine(root, normalized));
        if (path.StartsWith(root, StringComparison.OrdinalIgnoreCase) && File.Exists(path)) File.Delete(path);
    }
}
