using FacebookClone.API.Hubs;
using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Infrastructure;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.API.Services;

public sealed class ExpiredModerationPenaltyService(
    IServiceScopeFactory scopeFactory,
    IHubContext<LiveHub> liveHub,
    ILogger<ExpiredModerationPenaltyService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await RestoreExpiredAsync(stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
            catch (Exception ex) { logger.LogError(ex, "Could not restore expired moderation penalties."); }
            await Task.Delay(Interval, stoppingToken);
        }
    }

    private async Task RestoreExpiredAsync(CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = DateTime.UtcNow;
        var expired = await db.ModerationReports
            .Where(x => x.Status == ModerationReportStatus.Resolved && x.RestoredAt == null &&
                x.PunishmentEndsAt != null && x.PunishmentEndsAt <= now)
            .ToListAsync(cancellationToken);
        if (expired.Count == 0) return;

        var liveRestoredUsers = new List<Guid>();
        foreach (var group in expired.GroupBy(x => new { x.TargetOwnerId, x.ResolutionAction }))
        {
            foreach (var report in group)
            {
                report.RestoredAt = now;
                report.UpdatedAt = now;
            }

            var stillRestricted = await db.ModerationReports.AnyAsync(x =>
                x.TargetOwnerId == group.Key.TargetOwnerId && x.ResolutionAction == group.Key.ResolutionAction &&
                x.Status == ModerationReportStatus.Resolved && x.RestoredAt == null &&
                (x.PunishmentEndsAt == null || x.PunishmentEndsAt > now), cancellationToken);
            if (stillRestricted) continue;

            var owner = await db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == group.Key.TargetOwnerId, cancellationToken);
            if (owner == null) continue;
            RestoreFeature(owner, group.Key.ResolutionAction);
            if (group.Key.ResolutionAction == ModerationAction.LiveSuspended) liveRestoredUsers.Add(owner.Id);
        }

        await db.SaveChangesAsync(cancellationToken);
        foreach (var userId in liveRestoredUsers)
            await liveHub.Clients.User(userId.ToString()).SendAsync("LiveAccessRestored", cancellationToken);
    }

    private static void RestoreFeature(User owner, ModerationAction action)
    {
        switch (action)
        {
            case ModerationAction.PostSuspended: owner.IsPostSuspended = false; owner.PostSuspensionReason = null; owner.PostSuspendedAt = null; break;
            case ModerationAction.ReelSuspended: owner.IsReelSuspended = false; owner.ReelSuspensionReason = null; owner.ReelSuspendedAt = null; break;
            case ModerationAction.LiveSuspended: owner.IsLiveSuspended = false; owner.LiveSuspensionReason = null; owner.LiveSuspendedAt = null; break;
            case ModerationAction.MarketplaceSuspended: owner.IsMarketplaceSuspended = false; owner.MarketplaceSuspensionReason = null; owner.MarketplaceSuspendedAt = null; break;
            case ModerationAction.AccountBanned: owner.IsBanned = false; owner.BanReason = null; owner.BannedAt = null; break;
            default: return;
        }
        owner.UpdatedAt = DateTime.UtcNow;
    }
}
