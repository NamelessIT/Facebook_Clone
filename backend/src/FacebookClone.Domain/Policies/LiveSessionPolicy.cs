using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Constants;

namespace FacebookClone.Domain.Policies;

public static class LiveSessionPolicy
{
    public static readonly TimeSpan ReplayLifetime = TimeSpan.FromMinutes(SharedConstants.Live.ReplayLifetimeMinutes);

    public static DateTime ReplayExpiresAt(DateTime endedAt) => endedAt.Add(ReplayLifetime);

    public static bool IsReplayAvailable(LiveSession session, DateTime now) =>
        session.Status == LiveSessionStatus.Ended &&
        !string.IsNullOrWhiteSpace(session.RecordingUrl) &&
        (session.ConvertedPostId != null || session.RecordingExpiresAt > now);

    public static bool CanChangePrivacy(LiveSession session, Guid actorId) =>
        session.OwnerId == actorId && session.Status == LiveSessionStatus.Live;
}
