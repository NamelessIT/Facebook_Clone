using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Constants;

namespace FacebookClone.Domain.Policies;

public static class LiveSessionPolicy
{
    public static readonly TimeSpan ReplayLifetime = TimeSpan.FromMinutes(SharedConstants.Live.ReplayLifetimeMinutes);
    public static readonly TimeSpan EvidenceLifetime = TimeSpan.FromDays(SharedConstants.Live.EvidenceRetentionDays);
    public static readonly TimeSpan EvidenceUploadGrace = TimeSpan.FromMinutes(SharedConstants.Live.EvidenceUploadGraceMinutes);

    public static DateTime ReplayExpiresAt(DateTime endedAt) => endedAt.Add(ReplayLifetime);

    public static DateTime EvidenceExpiresAt(DateTime endedAt) => endedAt.Add(EvidenceLifetime);

    public static bool IsReplayAvailable(LiveSession session, DateTime now) =>
        session.Status == LiveSessionStatus.Ended &&
        !string.IsNullOrWhiteSpace(session.RecordingUrl) &&
        (session.ConvertedPostId != null || session.RecordingExpiresAt > now);

    public static bool IsEvidenceAvailable(LiveSession session, DateTime now) =>
        !string.IsNullOrWhiteSpace(session.RecordingUrl) &&
        (session.ConvertedPostId != null || session.EvidenceExpiresAt > now);

    public static bool CanUploadEvidence(LiveSession session, DateTime now) =>
        session.Status == LiveSessionStatus.Terminated &&
        session.ConvertedPostId == null &&
        string.IsNullOrWhiteSpace(session.RecordingUrl) &&
        session.UpdatedAt.Add(EvidenceUploadGrace) > now &&
        session.EvidenceExpiresAt > now;

    public static bool CanChangePrivacy(LiveSession session, Guid actorId) =>
        session.OwnerId == actorId && session.Status == LiveSessionStatus.Live;
}
