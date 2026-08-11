using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Policies;
using Xunit;

namespace FacebookClone.UnitTests;

public class LiveSessionPolicyTests
{
    [Fact]
    public void ReplayExpiresExactlyFifteenMinutesAfterLiveEnds()
    {
        var endedAt = new DateTime(2026, 8, 10, 4, 0, 0, DateTimeKind.Utc);
        Assert.Equal(endedAt.AddMinutes(15), LiveSessionPolicy.ReplayExpiresAt(endedAt));
    }

    [Fact]
    public void ModerationEvidenceExpiresSevenDaysAfterLiveEnds()
    {
        var endedAt = new DateTime(2026, 8, 10, 4, 0, 0, DateTimeKind.Utc);
        Assert.Equal(endedAt.AddDays(7), LiveSessionPolicy.EvidenceExpiresAt(endedAt));
    }

    [Fact]
    public void UnconvertedReplayIsUnavailableAfterExpiration()
    {
        var now = DateTime.UtcNow;
        var session = new LiveSession
        {
            Status = LiveSessionStatus.Ended,
            RecordingUrl = "/uploads/live-recordings/test.webm",
            RecordingExpiresAt = now.AddSeconds(-1)
        };
        Assert.False(LiveSessionPolicy.IsReplayAvailable(session, now));
    }

    [Fact]
    public void ConvertedReplayRemainsAvailableAfterOriginalExpiration()
    {
        var now = DateTime.UtcNow;
        var session = new LiveSession
        {
            Status = LiveSessionStatus.Ended,
            RecordingUrl = "/uploads/live-recordings/test.webm",
            RecordingExpiresAt = null,
            ConvertedPostId = Guid.NewGuid()
        };
        Assert.True(LiveSessionPolicy.IsReplayAvailable(session, now));
    }

    [Fact]
    public void ModeratorCanReviewEvidenceAfterOwnerReplayDeadline()
    {
        var now = DateTime.UtcNow;
        var session = new LiveSession
        {
            Status = LiveSessionStatus.Ended,
            RecordingUrl = "/uploads/live-recordings/test.webm",
            RecordingExpiresAt = now.AddMinutes(-1),
            EvidenceExpiresAt = now.AddDays(6)
        };
        Assert.False(LiveSessionPolicy.IsReplayAvailable(session, now));
        Assert.True(LiveSessionPolicy.IsEvidenceAvailable(session, now));
    }

    [Fact]
    public void EvidenceHoldKeepsRecordingAvailableUntilDecision()
    {
        var now = DateTime.UtcNow;
        var session = new LiveSession
        {
            Status = LiveSessionStatus.Terminated,
            RecordingUrl = "/uploads/live-recordings/test.webm",
            EvidenceExpiresAt = now.AddDays(-1),
            IsEvidenceOnHold = true
        };
        Assert.True(LiveSessionPolicy.IsEvidenceAvailable(session, now));
    }

    [Fact]
    public void OnlyOwnerCanChangePrivacyWhileSessionIsLive()
    {
        var ownerId = Guid.NewGuid();
        var session = new LiveSession { OwnerId = ownerId, Status = LiveSessionStatus.Live };
        Assert.True(LiveSessionPolicy.CanChangePrivacy(session, ownerId));
        Assert.False(LiveSessionPolicy.CanChangePrivacy(session, Guid.NewGuid()));
        session.Status = LiveSessionStatus.Ended;
        Assert.False(LiveSessionPolicy.CanChangePrivacy(session, ownerId));
    }
}
