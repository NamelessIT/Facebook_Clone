using FacebookClone.API.Common;
using Xunit;

namespace FacebookClone.UnitTests;

public class AdminRolePolicyTests
{
    [Fact]
    public void CanAssignRoles_AllowsOnlyStrictlyLowerRoles()
    {
        Assert.True(AdminRolePolicy.CanAssignRoles(80, [50, 10]));
        Assert.False(AdminRolePolicy.CanAssignRoles(80, [80]));
        Assert.False(AdminRolePolicy.CanAssignRoles(80, [100]));
    }

    [Fact]
    public void CanManageTarget_RejectsEqualOrHigherTarget()
    {
        Assert.True(AdminRolePolicy.CanManageTarget(100, [80]));
        Assert.False(AdminRolePolicy.CanManageTarget(80, [80]));
        Assert.False(AdminRolePolicy.CanManageTarget(50, [80]));
    }

    [Fact]
    public void RolePolicy_RejectsActorsWithoutRoleLevel()
    {
        Assert.False(AdminRolePolicy.CanAssignRoles(0, [10]));
        Assert.False(AdminRolePolicy.CanManageTarget(0, []));
    }
}
