using FacebookClone.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.Infrastructure.Repositories;

public class UserBlockRepository(AppDbContext db) : IUserBlockRepository
{
    public Task<bool> IsMessagingBlockedBetweenAsync(Guid firstUserId, Guid secondUserId) => db.UserBlocks.AsNoTracking().AnyAsync(x =>
        (x.BlockerId == firstUserId && x.BlockedUserId == secondUserId) ||
        (x.BlockerId == secondUserId && x.BlockedUserId == firstUserId));

    public Task<bool> IsFullyBlockedBetweenAsync(Guid firstUserId, Guid secondUserId) => db.UserBlocks.AsNoTracking().AnyAsync(x => x.Level == 2 && (
        (x.BlockerId == firstUserId && x.BlockedUserId == secondUserId) ||
        (x.BlockerId == secondUserId && x.BlockedUserId == firstUserId)));
}
