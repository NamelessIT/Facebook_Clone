namespace FacebookClone.Domain.Interfaces;

public interface IUserBlockRepository
{
    Task<bool> IsMessagingBlockedBetweenAsync(Guid firstUserId, Guid secondUserId);
    Task<bool> IsFullyBlockedBetweenAsync(Guid firstUserId, Guid secondUserId);
}
