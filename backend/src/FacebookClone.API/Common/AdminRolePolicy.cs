namespace FacebookClone.API.Common;

public static class AdminRolePolicy
{
    public static bool CanAssignRoles(int actorMaxRoleLevel, IEnumerable<int> requestedRoleLevels)
    {
        return actorMaxRoleLevel > 0 && requestedRoleLevels.All(level => level < actorMaxRoleLevel);
    }

    public static bool CanManageTarget(int actorMaxRoleLevel, IEnumerable<int> targetRoleLevels)
    {
        return actorMaxRoleLevel > 0 && targetRoleLevels.All(level => level < actorMaxRoleLevel);
    }
}
