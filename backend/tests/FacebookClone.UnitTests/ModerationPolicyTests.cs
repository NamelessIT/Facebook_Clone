using FacebookClone.Domain.Policies;
using Xunit;

namespace FacebookClone.UnitTests;

public class ModerationPolicyTests
{
    [Fact]
    public void NewReportHasTwentyFourHourReviewSla()
    {
        var createdAt = new DateTime(2026, 8, 13, 8, 0, 0, DateTimeKind.Utc);
        Assert.Equal(createdAt.AddHours(24), ModerationPolicy.ReviewDueAt(createdAt));
    }

    [Fact]
    public void TimedPenaltyEndsAfterSelectedDuration()
    {
        var startedAt = new DateTime(2026, 8, 13, 8, 0, 0, DateTimeKind.Utc);
        Assert.Equal(startedAt.AddHours(72), ModerationPolicy.PunishmentEndsAt(startedAt, 72));
    }

    [Fact]
    public void NullDurationRepresentsManualPermanentPenalty()
    {
        Assert.Null(ModerationPolicy.PunishmentEndsAt(DateTime.UtcNow, null));
    }
}
