using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Interfaces;
using FacebookClone.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.API.Services;

public class LiveAccessService(AppDbContext db, IUserBlockRepository userBlocks)
{
    public async Task<bool> IsModeratorAsync(Guid userId) => await db.Users.AsNoTracking().AnyAsync(u =>
        u.Id == userId && !u.IsDeleted && u.UserRoles.Any(ur => ur.Role.Level >= 50 &&
            ur.Role.RolePermissions.Any(rp => rp.Permission.Key == "lives.view")));

    public async Task<bool> HasPermissionAsync(Guid userId, string permission) => await db.Users.AsNoTracking().AnyAsync(u =>
        u.Id == userId && !u.IsDeleted && u.UserRoles.Any(ur =>
            ur.Role.RolePermissions.Any(rp => rp.Permission.Key == permission)));

    public async Task<bool> CanViewAsync(LiveSession session, Guid userId, bool moderatorBypass = true)
    {
        if (session.OwnerId == userId) return true;
        if (moderatorBypass && await IsModeratorAsync(userId)) return true;
        if (await userBlocks.IsFullyBlockedBetweenAsync(session.OwnerId, userId)) return false;
        if (session.Privacy == PostPrivacy.Public) return true;
        if (session.Privacy == PostPrivacy.Private) return false;
        return await db.Friendships.AsNoTracking().AnyAsync(f => f.Status == FriendshipStatus.Accepted &&
            ((f.RequesterId == session.OwnerId && f.ReceiverId == userId) ||
             (f.ReceiverId == session.OwnerId && f.RequesterId == userId)));
    }
}
