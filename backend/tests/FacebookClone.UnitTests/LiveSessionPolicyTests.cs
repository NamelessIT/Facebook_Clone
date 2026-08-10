using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Policies;
using Xunit;

namespace FacebookClone.UnitTests;

public class LiveSessionPolicyTests
{
    [Fact]
    public void ReplayExpiresExactlyThirtyMinutesAfterLiveEnds()
    {
        var endedAt = new DateTime(2026, 8, 10, 4, 0, 0, DateTimeKind.Utc);
        Assert.Equal(endedAt.AddMinutes(30), LiveSessionPolicy.ReplayExpiresAt(endedAt));
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
