using FacebookClone.Infrastructure;
using FacebookClone.Domain.Constants;
using FacebookClone.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.API.Services;

public class ExpiredLiveRecordingCleanupService(
    IServiceScopeFactory scopeFactory,
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
                var storage = scope.ServiceProvider.GetRequiredService<LiveRecordingStorageService>();
                var now = DateTime.UtcNow;
                var expired = await db.LiveSessions
                    .Where(x => x.ConvertedPostId == null &&
                        x.Status != LiveSessionStatus.Live &&
                        !x.IsEvidenceOnHold &&
                        ((x.EvidenceExpiresAt != null && x.EvidenceExpiresAt <= now) ||
                         (x.EvidenceExpiresAt == null && x.RecordingExpiresAt <= now)))
                    .ToListAsync(stoppingToken);
                foreach (var live in expired)
                {
                    storage.DeleteRecording(live.RecordingUrl);
                    storage.DeletePendingUploads(live.Id);
                }
                if (expired.Count > 0)
                {
                    db.LiveSessions.RemoveRange(expired);
                    await db.SaveChangesAsync(stoppingToken);
                    logger.LogInformation("Deleted {Count} live sessions after their moderation-evidence retention expired.", expired.Count);
                }
                storage.DeleteExpiredPendingUploads(now.AddMinutes(-SharedConstants.Live.ReplayLifetimeMinutes));
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
            catch (Exception ex) { logger.LogError(ex, "Failed to clean expired live recordings."); }
        }
    }

}
