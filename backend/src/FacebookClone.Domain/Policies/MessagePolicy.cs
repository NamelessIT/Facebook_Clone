using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;

namespace FacebookClone.Domain.Policies;

public static class MessagePolicy
{
    public static readonly TimeSpan EditWindow = TimeSpan.FromMinutes(15);

    public static bool CanEdit(Message message, Guid currentUserId, Guid? latestMessageId, DateTime now) =>
        message.SenderId == currentUserId &&
        !message.IsDeleted &&
        !message.IsRecalled &&
        message.MessageType == MessageType.Text &&
        now >= message.CreatedAt &&
        now - message.CreatedAt <= EditWindow &&
        latestMessageId == message.Id;
}
