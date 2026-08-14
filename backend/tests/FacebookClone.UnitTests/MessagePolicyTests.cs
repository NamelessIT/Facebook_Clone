using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Policies;
using Xunit;

namespace FacebookClone.UnitTests;

public class MessagePolicyTests
{
    private static Message CreateMessage(Guid senderId, DateTime createdAt) => new()
    {
        Id = Guid.NewGuid(),
        SenderId = senderId,
        ConversationId = Guid.NewGuid(),
        Content = "Nội dung",
        MessageType = MessageType.Text,
        CreatedAt = createdAt
    };

    [Fact]
    public void LatestOwnTextMessageCanBeEditedInsideFifteenMinutes()
    {
        var senderId = Guid.NewGuid();
        var now = new DateTime(2026, 8, 14, 5, 0, 0, DateTimeKind.Utc);
        var message = CreateMessage(senderId, now.AddMinutes(-15));

        Assert.True(MessagePolicy.CanEdit(message, senderId, message.Id, now));
    }

    [Fact]
    public void MessageCannotBeEditedAfterFifteenMinutes()
    {
        var senderId = Guid.NewGuid();
        var now = DateTime.UtcNow;
        var message = CreateMessage(senderId, now.AddMinutes(-15).AddTicks(-1));

        Assert.False(MessagePolicy.CanEdit(message, senderId, message.Id, now));
    }

    [Fact]
    public void OlderMessageCannotBeEditedEvenInsideWindow()
    {
        var senderId = Guid.NewGuid();
        var now = DateTime.UtcNow;
        var message = CreateMessage(senderId, now.AddMinutes(-1));

        Assert.False(MessagePolicy.CanEdit(message, senderId, Guid.NewGuid(), now));
    }

    [Fact]
    public void RecalledOrReplacementMessageCannotBeEdited()
    {
        var senderId = Guid.NewGuid();
        var now = DateTime.UtcNow;
        var message = CreateMessage(senderId, now.AddMinutes(-1));
        message.IsRecalled = true;

        Assert.False(MessagePolicy.CanEdit(message, senderId, message.Id, now));
        message.IsRecalled = false;
        message.IsDeleted = true;
        Assert.False(MessagePolicy.CanEdit(message, senderId, message.Id, now));
    }
}
