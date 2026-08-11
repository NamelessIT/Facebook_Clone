using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Constants;
using Xunit;

namespace FacebookClone.UnitTests;

/// <summary>
/// Guards the numeric enum values that are shared with the frontend and the DB
/// (source of truth: shared/contracts/enums.json). Changing a value here is a
/// breaking change and this test should fail if generated code drifts.
/// </summary>
public class EnumContractTests
{
    [Fact]
    public void PostPrivacy_values_are_stable()
    {
        Assert.Equal(1, (int)PostPrivacy.Public);
        Assert.Equal(2, (int)PostPrivacy.Friends);
        Assert.Equal(3, (int)PostPrivacy.Private);
    }

    [Fact]
    public void ReactionType_values_are_stable()
    {
        Assert.Equal(1, (int)ReactionType.Like);
        Assert.Equal(6, (int)ReactionType.Angry);
    }

    [Fact]
    public void PostType_values_are_stable()
    {
        Assert.Equal(2, (int)PostType.Share);
        Assert.Equal(4, (int)PostType.ProfilePicture);
        Assert.Equal(5, (int)PostType.CoverPhoto);
    }

    [Fact]
    public void PostInteractionType_string_constants_are_stable()
    {
        Assert.Equal("SAVED", PostInteractionType.SAVED);
        Assert.Equal("NOT_INTERESTED", PostInteractionType.NOT_INTERESTED);
    }

    [Fact]
    public void Shared_constants_are_stable()
    {
        Assert.Equal(300000, SharedConstants.Timers.AdminUsersRefreshMs);
        Assert.Equal(15, SharedConstants.Live.ReplayLifetimeMinutes);
        Assert.Equal(524288000, SharedConstants.Live.MaxRecordingSizeBytes);
        Assert.Equal(5000, SharedConstants.Live.DiscoveryPollIntervalMs);
        Assert.Equal(500, SharedConstants.Live.CommentMaxLength);
        Assert.Equal(900000, SharedConstants.Timers.PresenceHeartbeatMs);
        Assert.Equal(1000, SharedConstants.Limits.MessageMaxLength);
        Assert.Equal(800, SharedConstants.Localization.MaxTranslationChunkChars);
    }

    [Fact]
    public void Live_notification_type_is_stable()
    {
        Assert.Equal(6, (int)NotificationType.LiveStarted);
    }
}
