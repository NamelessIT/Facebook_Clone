using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.Infrastructure.Seed;

public class RbacSeeder : ISeeder
{
    private static readonly (string Name, string DisplayName, int Level)[] Roles =
    [
        ("super_admin", "Super Admin", 100),
        ("admin", "Admin", 80),
        ("moderator", "Moderator", 50),
        ("user", "User", 10),
    ];

    private static readonly (string Key, string Module, string Action, string Description)[] Permissions =
    [
        ("dashboard.view", "dashboard", "view", "View admin dashboard"),
        ("users.view", "users", "view", "View users"),
        ("users.manage", "users", "manage", "Ban, unban, delete users"),
        ("roles.view", "roles", "view", "View roles and permissions"),
        ("roles.manage", "roles", "manage", "Assign roles to users"),
        ("posts.view", "posts", "view", "View posts in admin"),
        ("posts.manage", "posts", "manage", "Moderate posts"),
        ("posts.delete", "posts", "delete", "Delete or hide posts"),
        ("posts.restore", "posts", "restore", "Restore deleted posts"),
        ("posts.ban_author", "posts", "ban_author", "Ban a user from a post moderation action"),
        ("reels.view", "reels", "view", "View reels in admin"),
        ("reels.manage", "reels", "manage", "Moderate reels"),
        ("reels.delete", "reels", "delete", "Delete or hide reels"),
        ("reels.restore", "reels", "restore", "Restore deleted reels"),
        ("reels.ban_author", "reels", "ban_author", "Ban a user from a reel moderation action"),
        ("security.view", "security", "view", "View security events"),
        ("security.manage", "security", "manage", "Manage block lists and security actions"),
        ("settings.manage", "settings", "manage", "Manage system settings"),
    ];

    public async Task SeedAsync(AppDbContext context)
    {
        var now = DateTime.UtcNow;

        foreach (var item in Roles)
        {
            var role = await context.Roles.SingleOrDefaultAsync(x => x.Name == item.Name);
            if (role == null)
            {
                context.Roles.Add(new Role
                {
                    Id = Guid.NewGuid(),
                    Name = item.Name,
                    DisplayName = item.DisplayName,
                    Level = item.Level,
                    IsSystem = true,
                    CreatedAt = now,
                    UpdatedAt = now
                });
            }
            else if (role.DisplayName != item.DisplayName || role.Level != item.Level)
            {
                role.DisplayName = item.DisplayName;
                role.Level = item.Level;
                role.UpdatedAt = now;
            }
        }

        foreach (var item in Permissions)
        {
            var permission = await context.Permissions.SingleOrDefaultAsync(x => x.Key == item.Key);
            if (permission == null)
            {
                context.Permissions.Add(new Permission
                {
                    Id = Guid.NewGuid(),
                    Key = item.Key,
                    Module = item.Module,
                    Action = item.Action,
                    Description = item.Description,
                    CreatedAt = now
                });
            }
        }

        await context.SaveChangesAsync();

        var roles = await context.Roles.ToDictionaryAsync(x => x.Name);
        var permissions = await context.Permissions.ToDictionaryAsync(x => x.Key);

        await GrantAsync(context, roles["super_admin"], permissions.Values.Select(x => x.Key).ToArray());
        await GrantAsync(context, roles["admin"], Permissions.Where(x => x.Key != "settings.manage").Select(x => x.Key).ToArray());
        await GrantAsync(context, roles["moderator"], [
            "dashboard.view", "users.view", "posts.view", "posts.manage",
            "posts.delete", "posts.restore", "reels.view", "reels.manage",
            "reels.delete", "reels.restore", "security.view"
        ]);
        await GrantAsync(context, roles["user"], []);

        var users = await context.Users.ToListAsync();
        foreach (var user in users)
        {
            var roleName = user.Email.Equals("admin@fbclone.com", StringComparison.OrdinalIgnoreCase)
                ? "super_admin"
                : user.IsAdmin
                    ? "admin"
                    : "user";

            await AssignRoleAsync(context, user.Id, roles[roleName].Id, now);
        }

        await context.SaveChangesAsync();
    }

    private static async Task GrantAsync(AppDbContext context, Role role, string[] permissionKeys)
    {
        var desired = await context.Permissions
            .Where(x => permissionKeys.Contains(x.Key))
            .Select(x => x.Id)
            .ToListAsync();

        var existing = await context.RolePermissions
            .Where(x => x.RoleId == role.Id)
            .Select(x => x.PermissionId)
            .ToListAsync();

        foreach (var permissionId in desired.Except(existing))
        {
            context.RolePermissions.Add(new RolePermission
            {
                RoleId = role.Id,
                PermissionId = permissionId
            });
        }
    }

    private static async Task AssignRoleAsync(AppDbContext context, Guid userId, Guid roleId, DateTime now)
    {
        var exists = await context.UserRoles.AnyAsync(x => x.UserId == userId && x.RoleId == roleId);
        if (exists) return;

        context.UserRoles.Add(new UserRole
        {
            UserId = userId,
            RoleId = roleId,
            AssignedAt = now
        });
    }
}
