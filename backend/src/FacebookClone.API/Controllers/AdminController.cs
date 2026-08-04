using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FacebookClone.API.Services;
using FacebookClone.API.Common;
using FacebookClone.Domain.Constants;
using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Infrastructure;

namespace FacebookClone.API.Controllers;

[ApiController]
[Route("api/v1/admin")]
[Authorize]
public class AdminController(
    AppDbContext db,
    ISecurityService security,
    ISecurityBlockService blockService,
    IInternalTranslationService translationService,
    ILogger<AdminController> logger) : ControllerBase
{
    // -----------------------------------------------------------------------
    // Guard: only admins may use this controller
    // -----------------------------------------------------------------------
    private IActionResult? RequireAdmin()
    {
        var userId = UserContext.GetUserId(User);
        var user = db.Users
            .AsNoTracking()
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefault(u => u.Id == userId);

        var hasAdminRole = user?.UserRoles.Any(ur => ur.Role.Level >= 50) == true;
        if (user == null || (!user.IsAdmin && !hasAdminRole))
            return Forbid();
        return null;
    }

    private async Task<bool> CurrentUserHasPermission(string permissionKey)
    {
        var userId = UserContext.GetUserId(User);
        return await db.Users
            .AsNoTracking()
            .Where(u => u.Id == userId && !u.IsDeleted)
            .AnyAsync(u => u.IsAdmin || u.UserRoles.Any(ur =>
                ur.Role.RolePermissions.Any(rp => rp.Permission.Key == permissionKey)));
    }

    private async Task<bool> CurrentUserRoleHasPermission(string permissionKey)
    {
        var userId = UserContext.GetUserId(User);
        return await db.UserRoles
            .AsNoTracking()
            .AnyAsync(ur => ur.UserId == userId &&
                ur.Role.RolePermissions.Any(rp => rp.Permission.Key == permissionKey));
    }

    private async Task<int> GetCurrentUserMaxRoleLevel()
    {
        var userId = UserContext.GetUserId(User);
        var user = await db.Users
            .AsNoTracking()
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);

        if (user == null) return 0;
        return user.UserRoles.Select(ur => ur.Role.Level)
            .DefaultIfEmpty(user.IsAdmin ? SharedConstants.Limits.MaxRoleLevel : 0)
            .Max();
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetAdminMe()
    {
        if (RequireAdmin() is { } err) return err;

        var userId = UserContext.GetUserId(User);
        var user = await db.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.FirstName,
                u.LastName,
                u.IsAdmin,
                Roles = u.UserRoles
                    .Select(ur => new { ur.Role.Id, ur.Role.Name, ur.Role.DisplayName, ur.Role.Level })
                    .OrderByDescending(r => r.Level)
                    .ToList(),
                Permissions = u.UserRoles
                    .SelectMany(ur => ur.Role.RolePermissions.Select(rp => rp.Permission.Key))
                    .Distinct()
                    .OrderBy(x => x)
                    .ToList()
            })
            .FirstOrDefaultAsync();

        if (user == null) return NotFound(new { success = false, message = "User not found." });
        return Ok(new { success = true, data = user });
    }

    // -----------------------------------------------------------------------
    // Dashboard
    // -----------------------------------------------------------------------

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        if (RequireAdmin() is { } err) return err;

        var now = DateTime.UtcNow;
        var onlineCutoff = now.AddMinutes(-SharedConstants.Timers.UserOnlineTtlMinutes);
        var totalUsers = await db.Users.CountAsync(u => !u.IsDeleted);
        var activeToday = await db.Users.CountAsync(u => !u.IsDeleted && u.IsOnline && u.UpdatedAt >= onlineCutoff);
        var newUsersLast7d = await db.Users.CountAsync(u => !u.IsDeleted && u.CreatedAt >= now.AddDays(-7));
        var totalPosts = await db.Posts.CountAsync(p => !p.IsDeleted);
        var postsToday = await db.Posts.CountAsync(p => !p.IsDeleted && p.CreatedAt >= now.Date);
        var deletedPosts = await db.Posts.CountAsync(p => p.IsDeleted);
        var totalReels = await db.Reels.CountAsync(r => !r.IsDeleted);
        var deletedReels = await db.Reels.CountAsync(r => r.IsDeleted);
        var totalComments = await db.Comments.CountAsync();
        var totalGroups = await db.Groups.CountAsync();
        var bannedUsers = await db.Users.CountAsync(u => u.IsBanned);
        var roleCount = await db.Roles.CountAsync();
        var permissionCount = await db.Permissions.CountAsync();
        var secStats = security.GetStats();

        return Ok(new
        {
            success = true,
            data = new
            {
                users = new { total = totalUsers, activeNow = activeToday, newLast7Days = newUsersLast7d, banned = bannedUsers },
                content = new { totalPosts, postsToday, deletedPosts, totalReels, deletedReels, totalComments, totalGroups },
                rbac = new { roleCount, permissionCount },
                security = new
                {
                    blockedIps = secStats.TotalBlockedIps,
                    eventsLast24h = secStats.EventsLast24h,
                    rateLimitHitsLast1h = secStats.RateLimitHitsLast1h,
                    bruteForceAttemptsLast1h = secStats.BruteForceAttemptsLast1h,
                    topAttackerIps = secStats.TopAttackerIps,
                }
            }
        });
    }

    // -----------------------------------------------------------------------
    // User Management
    // -----------------------------------------------------------------------

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? filter = null)
    {
        if (RequireAdmin() is { } err) return err;

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Users.AsNoTracking().Where(u => !u.IsDeleted);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(u =>
                u.FirstName.ToLower().Contains(s) ||
                u.LastName.ToLower().Contains(s) ||
                u.Email.ToLower().Contains(s));
        }

        if (filter == "banned") query = query.Where(u => u.IsBanned);
        else if (filter == "admin") query = query.Where(u => u.IsAdmin);
        else if (filter == "online")
        {
            var onlineCutoff = DateTime.UtcNow.AddMinutes(-SharedConstants.Timers.UserOnlineTtlMinutes);
            query = query.Where(u => u.IsOnline && u.UpdatedAt >= onlineCutoff);
        }

        var total = await query.CountAsync();
        var onlineThreshold = DateTime.UtcNow.AddMinutes(-SharedConstants.Timers.UserOnlineTtlMinutes);
        var items = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new
            {
                u.Id, u.FirstName, u.LastName, u.Email,
                u.AvatarUrl,
                IsOnline = u.IsOnline && u.UpdatedAt >= onlineThreshold,
                LastActiveAt = u.UpdatedAt,
                u.IsAdmin, u.IsBanned,
                u.BanReason, u.BannedAt, u.CreatedAt,
                Roles = u.UserRoles
                    .Select(ur => new { ur.Role.Id, ur.Role.Name, ur.Role.DisplayName, ur.Role.Level })
                    .OrderByDescending(r => r.Level)
                    .ToList()
            })
            .ToListAsync();

        return Ok(new
        {
            success = true,
            data = items,
            pagination = new { page, pageSize, total, totalPages = (int)Math.Ceiling((double)total / pageSize) }
        });
    }

    [HttpGet("users/creation-options")]
    public async Task<IActionResult> GetUserCreationOptions()
    {
        if (RequireAdmin() is { } err) return err;
        var canCreateUsers = await CurrentUserRoleHasPermission("users.manage");
        var canAssignRoles = await CurrentUserHasPermission("roles.manage");
        if (!canCreateUsers && !canAssignRoles) return Forbid();

        var maxRoleLevel = await GetCurrentUserMaxRoleLevel();
        var roles = await db.Roles
            .AsNoTracking()
            .Where(r => r.Level < maxRoleLevel)
            .OrderByDescending(r => r.Level)
            .Select(r => new { r.Id, r.Name, r.DisplayName, r.Level })
            .ToListAsync();

        return Ok(new { success = true, data = new { maxRoleLevel, canCreateUsers, canAssignRoles, roles } });
    }

    [HttpPost("users")]
    public async Task<IActionResult> CreateManagedUser([FromBody] CreateManagedUserRequest req)
    {
        if (RequireAdmin() is { } err) return err;
        if (!await CurrentUserRoleHasPermission("users.manage")) return Forbid();

        var email = (req.Email ?? string.Empty).Trim().ToLowerInvariant();
        var firstName = (req.FirstName ?? string.Empty).Trim();
        var lastName = (req.LastName ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(firstName) || string.IsNullOrWhiteSpace(lastName))
            return BadRequest(new { success = false, message = "Email, first name and last name are required." });
        if (!email.Contains('@') || email.Length > 255)
            return BadRequest(new { success = false, message = "Email is invalid." });
        if (string.IsNullOrWhiteSpace(req.Password) ||
            req.Password.Length < SharedConstants.Limits.PasswordMinLength ||
            !req.Password.Any(char.IsUpper) ||
            !req.Password.Any(char.IsLower) ||
            !req.Password.Any(char.IsDigit))
        {
            return BadRequest(new
            {
                success = false,
                message = "Password must be at least 8 characters and include uppercase, lowercase and a number."
            });
        }
        if (req.RoleIds == null || req.RoleIds.Count == 0)
            return BadRequest(new { success = false, message = "At least one role is required." });
        if (await db.Users.AnyAsync(u => u.Email == email))
            return Conflict(new { success = false, message = "Email is already in use." });

        var actorId = UserContext.GetUserId(User);
        var maxRoleLevel = await GetCurrentUserMaxRoleLevel();
        var roleIds = req.RoleIds.Distinct().ToList();
        var roles = await db.Roles.Where(r => roleIds.Contains(r.Id)).ToListAsync();
        if (roles.Count != roleIds.Count)
            return BadRequest(new { success = false, message = "One or more roles are invalid." });
        if (!AdminRolePolicy.CanAssignRoles(maxRoleLevel, roles.Select(r => r.Level)))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                success = false,
                message = "You can only assign roles below your highest role."
            });
        }

        var now = DateTime.UtcNow;
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            FirstName = firstName,
            LastName = lastName,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            IsAdmin = roles.Any(r => r.Level >= SharedConstants.Limits.AdminRoleMinLevel),
            IsOnline = false,
            IsDeleted = false,
            CreatedAt = now,
            UpdatedAt = now
        };

        await using var transaction = await db.Database.BeginTransactionAsync(HttpContext.RequestAborted);
        db.Users.Add(user);
        foreach (var role in roles)
        {
            db.UserRoles.Add(new UserRole
            {
                UserId = user.Id,
                RoleId = role.Id,
                AssignedAt = now,
                AssignedByUserId = actorId
            });
        }

        await db.SaveChangesAsync(HttpContext.RequestAborted);
        await transaction.CommitAsync(HttpContext.RequestAborted);

        logger.LogInformation("Admin {AdminId} created managed account {UserId} with roles {RoleIds}",
            actorId, user.Id, roleIds);
        return StatusCode(StatusCodes.Status201Created, new
        {
            success = true,
            data = new
            {
                user.Id,
                user.Email,
                user.FirstName,
                user.LastName,
                user.IsAdmin,
                Roles = roles.Select(r => new { r.Id, r.Name, r.DisplayName, r.Level })
            },
            message = "Account created. The password is only available to the administrator who entered it."
        });
    }

    [HttpPut("users/{id}/ban")]
    public async Task<IActionResult> BanUser(Guid id, [FromBody] BanRequest req)
    {
        if (RequireAdmin() is { } err) return err;
        if (!await CurrentUserHasPermission("users.manage")) return Forbid();

        var target = await db.Users.FindAsync(id);
        if (target == null) return NotFound(new { success = false, message = "User not found." });
        if (target.IsAdmin) return BadRequest(new { success = false, message = "Cannot ban an admin." });

        target.IsBanned = true;
        target.BanReason = req.Reason;
        target.BannedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        security.RecordEvent(SecurityEventType.ManualBanned, "admin",
            $"Admin banned user {id}: {req.Reason}");

        logger.LogWarning("Admin banned user {UserId}: {Reason}", id, req.Reason);
        return Ok(new { success = true, message = "User has been banned." });
    }

    [HttpPut("users/{id}/unban")]
    public async Task<IActionResult> UnbanUser(Guid id)
    {
        if (RequireAdmin() is { } err) return err;
        if (!await CurrentUserHasPermission("users.manage")) return Forbid();

        var target = await db.Users.FindAsync(id);
        if (target == null) return NotFound(new { success = false, message = "User not found." });

        target.IsBanned = false;
        target.BanReason = null;
        target.BannedAt = null;
        await db.SaveChangesAsync();

        security.RecordEvent(SecurityEventType.ManualUnbanned, "admin",
            $"Admin unbanned user {id}");

        return Ok(new { success = true, message = "User has been unbanned." });
    }

    [HttpPut("users/{id}/toggle-admin")]
    public async Task<IActionResult> ToggleAdmin(Guid id)
    {
        if (RequireAdmin() is { } err) return err;
        if (!await CurrentUserHasPermission("roles.manage")) return Forbid();

        var target = await db.Users.FindAsync(id);
        if (target == null) return NotFound(new { success = false, message = "User not found." });

        target.IsAdmin = !target.IsAdmin;
        var adminRole = await db.Roles.SingleOrDefaultAsync(r => r.Name == "admin");
        if (adminRole != null)
        {
            var existing = await db.UserRoles.FindAsync(id, adminRole.Id);
            if (target.IsAdmin && existing == null)
            {
                db.UserRoles.Add(new FacebookClone.Domain.Entities.UserRole
                {
                    UserId = id,
                    RoleId = adminRole.Id,
                    AssignedAt = DateTime.UtcNow,
                    AssignedByUserId = UserContext.GetUserId(User)
                });
            }
            else if (!target.IsAdmin && existing != null)
            {
                db.UserRoles.Remove(existing);
            }
        }

        await db.SaveChangesAsync();

        return Ok(new { success = true, isAdmin = target.IsAdmin, message = $"User admin status: {target.IsAdmin}" });
    }

    // -----------------------------------------------------------------------
    // RBAC
    // -----------------------------------------------------------------------

    [HttpGet("roles")]
    public async Task<IActionResult> GetRoles()
    {
        if (RequireAdmin() is { } err) return err;
        if (!await CurrentUserHasPermission("roles.view")) return Forbid();

        var roles = await db.Roles
            .AsNoTracking()
            .OrderByDescending(r => r.Level)
            .Select(r => new
            {
                r.Id,
                r.Name,
                r.DisplayName,
                r.Level,
                r.IsSystem,
                UserCount = r.UserRoles.Count,
                Permissions = r.RolePermissions
                    .Select(rp => new
                    {
                        rp.Permission.Id,
                        rp.Permission.Key,
                        rp.Permission.Module,
                        rp.Permission.Action,
                        rp.Permission.Description
                    })
                    .OrderBy(p => p.Module)
                    .ThenBy(p => p.Action)
                    .ToList()
            })
            .ToListAsync();

        var permissions = await db.Permissions
            .AsNoTracking()
            .OrderBy(p => p.Module)
            .ThenBy(p => p.Action)
            .Select(p => new { p.Id, p.Key, p.Module, p.Action, p.Description })
            .ToListAsync();

        return Ok(new { success = true, data = new { roles, permissions } });
    }

    [HttpPost("roles")]
    public async Task<IActionResult> CreateRole([FromBody] RoleUpsertRequest req)
    {
        if (RequireAdmin() is { } err) return err;
        if (!await CurrentUserHasPermission("roles.manage")) return Forbid();

        var name = NormalizeKey(req.Name);
        if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(req.DisplayName))
            return BadRequest(new { success = false, message = "Role name and display name are required." });

        if (await db.Roles.AnyAsync(r => r.Name == name))
            return BadRequest(new { success = false, message = "Role name already exists." });

        var now = DateTime.UtcNow;
        var role = new FacebookClone.Domain.Entities.Role
        {
            Id = Guid.NewGuid(),
            Name = name,
            DisplayName = req.DisplayName.Trim(),
            Level = Math.Clamp(req.Level, 1, 100),
            IsSystem = false,
            CreatedAt = now,
            UpdatedAt = now
        };

        db.Roles.Add(role);
        await db.SaveChangesAsync();
        return Ok(new { success = true, data = role, message = "Role created." });
    }

    [HttpPut("roles/{id}")]
    public async Task<IActionResult> UpdateRole(Guid id, [FromBody] RoleUpsertRequest req)
    {
        if (RequireAdmin() is { } err) return err;
        if (!await CurrentUserHasPermission("roles.manage")) return Forbid();

        var role = await db.Roles.FindAsync(id);
        if (role == null) return NotFound(new { success = false, message = "Role not found." });

        var name = NormalizeKey(req.Name);
        if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(req.DisplayName))
            return BadRequest(new { success = false, message = "Role name and display name are required." });

        if (await db.Roles.AnyAsync(r => r.Id != id && r.Name == name))
            return BadRequest(new { success = false, message = "Role name already exists." });

        role.Name = name;
        role.DisplayName = req.DisplayName.Trim();
        role.Level = Math.Clamp(req.Level, 1, 100);
        role.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(new { success = true, data = role, message = "Role updated." });
    }

    [HttpDelete("roles/{id}")]
    public async Task<IActionResult> DeleteRole(Guid id)
    {
        if (RequireAdmin() is { } err) return err;
        if (!await CurrentUserHasPermission("roles.manage")) return Forbid();

        var role = await db.Roles
            .Include(r => r.UserRoles)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (role == null) return NotFound(new { success = false, message = "Role not found." });
        if (role.UserRoles.Any())
            return BadRequest(new { success = false, message = "Cannot delete a role that is assigned to users." });

        db.Roles.Remove(role);
        await db.SaveChangesAsync();
        return Ok(new { success = true, message = "Role deleted." });
    }

    [HttpPut("roles/{id}/permissions")]
    public async Task<IActionResult> SetRolePermissions(Guid id, [FromBody] SetRolePermissionsRequest req)
    {
        if (RequireAdmin() is { } err) return err;
        if (!await CurrentUserHasPermission("roles.manage")) return Forbid();

        var role = await db.Roles
            .Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (role == null) return NotFound(new { success = false, message = "Role not found." });

        var permissionIds = req.PermissionIds.Distinct().ToList();
        var permissions = await db.Permissions.Where(p => permissionIds.Contains(p.Id)).ToListAsync();
        if (permissions.Count != permissionIds.Count)
            return BadRequest(new { success = false, message = "Invalid permission id." });

        db.RolePermissions.RemoveRange(role.RolePermissions);
        foreach (var permission in permissions)
        {
            db.RolePermissions.Add(new FacebookClone.Domain.Entities.RolePermission
            {
                RoleId = role.Id,
                PermissionId = permission.Id
            });
        }

        role.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { success = true, message = "Role permissions updated." });
    }

    [HttpPut("users/{id}/roles")]
    public async Task<IActionResult> SetUserRoles(Guid id, [FromBody] SetUserRolesRequest req)
    {
        if (RequireAdmin() is { } err) return err;
        if (!await CurrentUserHasPermission("roles.manage")) return Forbid();

        var actorId = UserContext.GetUserId(User);
        if (id == actorId)
            return BadRequest(new { success = false, message = "You cannot change your own roles." });

        var maxRoleLevel = await GetCurrentUserMaxRoleLevel();
        var target = await db.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
        if (target == null) return NotFound(new { success = false, message = "User not found." });
        if (!AdminRolePolicy.CanManageTarget(maxRoleLevel, target.UserRoles.Select(ur => ur.Role.Level)))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                success = false,
                message = "You cannot change roles for an account at or above your level."
            });
        }

        var roleIds = req.RoleIds.Distinct().ToList();
        var roles = await db.Roles.Where(r => roleIds.Contains(r.Id)).ToListAsync();
        if (roles.Count != roleIds.Count) return BadRequest(new { success = false, message = "Invalid role id." });
        if (!AdminRolePolicy.CanAssignRoles(maxRoleLevel, roles.Select(r => r.Level)))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                success = false,
                message = "You can only assign roles below your highest role."
            });
        }

        db.UserRoles.RemoveRange(target.UserRoles);
        foreach (var role in roles)
        {
            db.UserRoles.Add(new FacebookClone.Domain.Entities.UserRole
            {
                UserId = target.Id,
                RoleId = role.Id,
                AssignedAt = DateTime.UtcNow,
                AssignedByUserId = actorId
            });
        }

        target.IsAdmin = roles.Any(r => r.Level >= SharedConstants.Limits.AdminRoleMinLevel);
        target.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(new { success = true, message = "Roles updated." });
    }

    private static string NormalizeKey(string value)
    {
        return value.Trim().ToLowerInvariant().Replace(' ', '_');
    }

    private async Task<IActionResult?> ValidateLocalizationEntryRequest(LocalizationEntryUpsertRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Key) ||
            string.IsNullOrWhiteSpace(req.SourceLocale) ||
            string.IsNullOrWhiteSpace(req.TargetLocale) ||
            string.IsNullOrWhiteSpace(req.SourceText))
        {
            return BadRequest(new { success = false, message = "Key, source locale, target locale and source text are required." });
        }

        var targetLocale = NormalizeLocale(req.TargetLocale);
        var languageExists = await db.LocaleLanguages.AnyAsync(x => x.Code == targetLocale && x.IsEnabled);
        if (!languageExists)
        {
            return BadRequest(new { success = false, message = $"Target locale '{targetLocale}' is not enabled." });
        }

        var value = req.Value ?? string.Empty;
        if (req.SourceText.Length > 4000 || value.Length > 4000)
        {
            return BadRequest(new { success = false, message = "Source text and value must be 4000 characters or fewer." });
        }

        return null;
    }

    private static string NormalizeLocale(string value)
    {
        return value.Trim().ToLowerInvariant();
    }

    // -----------------------------------------------------------------------
    // Content Management
    // -----------------------------------------------------------------------

    [HttpGet("posts")]
    public async Task<IActionResult> GetPosts([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? search = null)
    {
        if (RequireAdmin() is { } err) return err;
        if (!await CurrentUserHasPermission("posts.view")) return Forbid();

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = db.Posts.AsNoTracking().Include(p => p.User).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(p => p.Content.ToLower().Contains(s) || p.User.Email.ToLower().Contains(s));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new
            {
                p.Id,
                p.Content,
                p.Privacy,
                p.PostType,
                p.IsDeleted,
                p.CreatedAt,
                Author = new { p.UserId, p.User.FirstName, p.User.LastName, p.User.Email, p.User.IsBanned },
                Comments = p.Comments.Count,
                Reactions = p.Reactions.Count
            })
            .ToListAsync();

        return Ok(new { success = true, data = items, pagination = new { page, pageSize, total, totalPages = (int)Math.Ceiling((double)total / pageSize) } });
    }

    [HttpPut("posts/{id}/delete")]
    public async Task<IActionResult> DeletePostAsAdmin(Guid id)
    {
        if (RequireAdmin() is { } err) return err;
        if (!await CurrentUserHasPermission("posts.delete")) return Forbid();

        var post = await db.Posts.Include(p => p.User).FirstOrDefaultAsync(p => p.Id == id);
        if (post == null) return NotFound(new { success = false, message = "Post not found." });

        post.IsDeleted = true;
        post.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        logger.LogWarning("Admin deleted post {PostId} by user {UserId}", id, post.UserId);
        return Ok(new { success = true, message = "Post deleted." });
    }

    [HttpPut("posts/{id}/restore")]
    public async Task<IActionResult> RestorePostAsAdmin(Guid id)
    {
        if (RequireAdmin() is { } err) return err;
        if (!await CurrentUserHasPermission("posts.restore")) return Forbid();

        var post = await db.Posts.FindAsync(id);
        if (post == null) return NotFound(new { success = false, message = "Post not found." });

        post.IsDeleted = false;
        post.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(new { success = true, message = "Post restored." });
    }

    [HttpPut("posts/{id}/ban-author")]
    public async Task<IActionResult> BanPostAuthor(Guid id, [FromBody] BanRequest req)
    {
        if (RequireAdmin() is { } err) return err;
        if (!await CurrentUserHasPermission("posts.ban_author")) return Forbid();

        var post = await db.Posts.Include(p => p.User).FirstOrDefaultAsync(p => p.Id == id);
        if (post == null) return NotFound(new { success = false, message = "Post not found." });
        if (post.User.IsAdmin) return BadRequest(new { success = false, message = "Cannot ban an admin." });

        post.User.IsBanned = true;
        post.User.BanReason = string.IsNullOrWhiteSpace(req.Reason) ? $"Banned from post moderation: {id}" : req.Reason;
        post.User.BannedAt = DateTime.UtcNow;
        post.User.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        security.RecordEvent(SecurityEventType.ManualBanned, "admin",
            $"Admin banned author {post.UserId} from post {id}: {post.User.BanReason}");
        logger.LogWarning("Admin banned author {UserId} from post {PostId}", post.UserId, id);

        return Ok(new { success = true, message = "Post author banned." });
    }

    [HttpGet("reels")]
    public async Task<IActionResult> GetReels([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? search = null)
    {
        if (RequireAdmin() is { } err) return err;
        if (!await CurrentUserHasPermission("reels.view")) return Forbid();

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = db.Reels.AsNoTracking().Include(r => r.User).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(r =>
                (r.Caption != null && r.Caption.ToLower().Contains(s)) ||
                (r.Title != null && r.Title.ToLower().Contains(s)) ||
                r.User.Email.ToLower().Contains(s));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new
            {
                r.Id,
                r.Title,
                r.Caption,
                r.Privacy,
                r.ViewsCount,
                r.IsDeleted,
                r.CreatedAt,
                Author = new { r.UserId, r.User.FirstName, r.User.LastName, r.User.Email, r.User.IsBanned },
                Likes = r.Likes.Count
            })
            .ToListAsync();

        return Ok(new { success = true, data = items, pagination = new { page, pageSize, total, totalPages = (int)Math.Ceiling((double)total / pageSize) } });
    }

    [HttpPut("reels/{id}/delete")]
    public async Task<IActionResult> DeleteReelAsAdmin(Guid id)
    {
        if (RequireAdmin() is { } err) return err;
        if (!await CurrentUserHasPermission("reels.delete")) return Forbid();

        var reel = await db.Reels.Include(r => r.User).FirstOrDefaultAsync(r => r.Id == id);
        if (reel == null) return NotFound(new { success = false, message = "Reel not found." });

        reel.IsDeleted = true;
        reel.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        logger.LogWarning("Admin deleted reel {ReelId} by user {UserId}", id, reel.UserId);
        return Ok(new { success = true, message = "Reel deleted." });
    }

    [HttpPut("reels/{id}/restore")]
    public async Task<IActionResult> RestoreReelAsAdmin(Guid id)
    {
        if (RequireAdmin() is { } err) return err;
        if (!await CurrentUserHasPermission("reels.restore")) return Forbid();

        var reel = await db.Reels.FindAsync(id);
        if (reel == null) return NotFound(new { success = false, message = "Reel not found." });

        reel.IsDeleted = false;
        reel.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(new { success = true, message = "Reel restored." });
    }

    [HttpPut("reels/{id}/ban-author")]
    public async Task<IActionResult> BanReelAuthor(Guid id, [FromBody] BanRequest req)
    {
        if (RequireAdmin() is { } err) return err;
        if (!await CurrentUserHasPermission("reels.ban_author")) return Forbid();

        var reel = await db.Reels.Include(r => r.User).FirstOrDefaultAsync(r => r.Id == id);
        if (reel == null) return NotFound(new { success = false, message = "Reel not found." });
        if (reel.User.IsAdmin) return BadRequest(new { success = false, message = "Cannot ban an admin." });

        reel.User.IsBanned = true;
        reel.User.BanReason = string.IsNullOrWhiteSpace(req.Reason) ? $"Banned from reel moderation: {id}" : req.Reason;
        reel.User.BannedAt = DateTime.UtcNow;
        reel.User.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        security.RecordEvent(SecurityEventType.ManualBanned, "admin",
            $"Admin banned author {reel.UserId} from reel {id}: {reel.User.BanReason}");
        logger.LogWarning("Admin banned author {UserId} from reel {ReelId}", reel.UserId, id);

        return Ok(new { success = true, message = "Reel author banned." });
    }

    [HttpDelete("users/{id}")]
    public async Task<IActionResult> SoftDeleteUser(Guid id)
    {
        if (RequireAdmin() is { } err) return err;
        if (!await CurrentUserHasPermission("users.manage")) return Forbid();

        var target = await db.Users.FindAsync(id);
        if (target == null) return NotFound(new { success = false, message = "User not found." });
        if (target.IsAdmin) return BadRequest(new { success = false, message = "Cannot delete an admin." });

        target.IsDeleted = true;
        await db.SaveChangesAsync();

        logger.LogWarning("Admin soft-deleted user {UserId}", id);
        return Ok(new { success = true, message = "User deleted." });
    }

    // -----------------------------------------------------------------------
    // Localization
    // -----------------------------------------------------------------------

    [HttpGet("localization")]
    public async Task<IActionResult> GetLocalization(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? locale = null,
        [FromQuery] string? search = null)
    {
        if (RequireAdmin() is { } err) return err;
        if (!await CurrentUserHasPermission("localization.view")) return Forbid();

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 1000);

        var languages = await db.LocaleLanguages
            .AsNoTracking()
            .OrderByDescending(x => x.IsDefault)
            .ThenBy(x => x.Code)
            .Select(x => new
            {
                x.Id,
                x.Code,
                x.DisplayName,
                x.NativeName,
                x.IsEnabled,
                x.IsDefault,
                x.UpdatedAt
            })
            .ToListAsync();

        var query = db.LocalizationEntries.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(locale))
        {
            var normalizedLocale = NormalizeLocale(locale);
            query = query.Where(x => x.TargetLocale == normalizedLocale);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(x =>
                x.Key.ToLower().Contains(s) ||
                x.SourceText.ToLower().Contains(s) ||
                x.Value.ToLower().Contains(s));
        }

        var total = await query.CountAsync();
        var entries = await query
            .OrderBy(x => x.TargetLocale)
            .ThenBy(x => x.Key)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new
            {
                x.Id,
                x.Key,
                x.SourceLocale,
                x.TargetLocale,
                x.SourceText,
                x.Value,
                x.Context,
                x.IsMachineTranslated,
                x.LastError,
                x.UpdatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            success = true,
            data = new { languages, entries },
            pagination = new { page, pageSize, total, totalPages = (int)Math.Ceiling((double)total / pageSize) }
        });
    }

    [HttpPost("localization/languages")]
    public async Task<IActionResult> CreateLocaleLanguage([FromBody] LocaleLanguageUpsertRequest req)
    {
        if (RequireAdmin() is { } err) return err;
        if (!await CurrentUserHasPermission("localization.manage")) return Forbid();

        var code = NormalizeLocale(req.Code);
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(req.DisplayName))
            return BadRequest(new { success = false, message = "Locale code and display name are required." });

        if (await db.LocaleLanguages.AnyAsync(x => x.Code == code))
            return BadRequest(new { success = false, message = "Locale code already exists." });

        var now = DateTime.UtcNow;
        if (req.IsDefault)
        {
            await db.LocaleLanguages.ExecuteUpdateAsync(s => s.SetProperty(x => x.IsDefault, false));
        }

        var language = new LocaleLanguage
        {
            Id = Guid.NewGuid(),
            Code = code,
            DisplayName = req.DisplayName.Trim(),
            NativeName = string.IsNullOrWhiteSpace(req.NativeName) ? req.DisplayName.Trim() : req.NativeName.Trim(),
            IsEnabled = req.IsEnabled,
            IsDefault = req.IsDefault,
            CreatedAt = now,
            UpdatedAt = now
        };

        db.LocaleLanguages.Add(language);
        await db.SaveChangesAsync();
        return Ok(new { success = true, data = language, message = "Locale language created." });
    }

    [HttpPut("localization/languages/{id}")]
    public async Task<IActionResult> UpdateLocaleLanguage(Guid id, [FromBody] LocaleLanguageUpsertRequest req)
    {
        if (RequireAdmin() is { } err) return err;
        if (!await CurrentUserHasPermission("localization.manage")) return Forbid();

        var language = await db.LocaleLanguages.FindAsync(id);
        if (language == null) return NotFound(new { success = false, message = "Locale language not found." });

        var code = NormalizeLocale(req.Code);
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(req.DisplayName))
            return BadRequest(new { success = false, message = "Locale code and display name are required." });

        if (await db.LocaleLanguages.AnyAsync(x => x.Id != id && x.Code == code))
            return BadRequest(new { success = false, message = "Locale code already exists." });

        if (req.IsDefault)
        {
            await db.LocaleLanguages
                .Where(x => x.Id != id)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.IsDefault, false));
        }

        language.Code = code;
        language.DisplayName = req.DisplayName.Trim();
        language.NativeName = string.IsNullOrWhiteSpace(req.NativeName) ? req.DisplayName.Trim() : req.NativeName.Trim();
        language.IsEnabled = req.IsEnabled;
        language.IsDefault = req.IsDefault;
        language.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(new { success = true, data = language, message = "Locale language updated." });
    }

    [HttpPost("localization/entries")]
    public async Task<IActionResult> CreateLocalizationEntry([FromBody] LocalizationEntryUpsertRequest req)
    {
        if (RequireAdmin() is { } err) return err;
        if (!await CurrentUserHasPermission("localization.manage")) return Forbid();

        var validationError = await ValidateLocalizationEntryRequest(req);
        if (validationError != null) return validationError;

        var key = req.Key.Trim();
        var targetLocale = NormalizeLocale(req.TargetLocale);
        if (await db.LocalizationEntries.AnyAsync(x => x.Key == key && x.TargetLocale == targetLocale))
            return BadRequest(new { success = false, message = "Translation key already exists for this target locale." });

        var now = DateTime.UtcNow;
        var entry = new LocalizationEntry
        {
            Id = Guid.NewGuid(),
            Key = key,
            SourceLocale = NormalizeLocale(req.SourceLocale),
            TargetLocale = targetLocale,
            SourceText = req.SourceText.Trim(),
            Value = (req.Value ?? string.Empty).Trim(),
            Context = string.IsNullOrWhiteSpace(req.Context) ? null : req.Context.Trim(),
            IsMachineTranslated = req.IsMachineTranslated,
            LastError = string.IsNullOrWhiteSpace(req.LastError) ? null : req.LastError.Trim(),
            CreatedAt = now,
            UpdatedAt = now
        };

        db.LocalizationEntries.Add(entry);
        await db.SaveChangesAsync();
        return Ok(new { success = true, data = entry, message = "Translation saved." });
    }

    [HttpPut("localization/entries/{id}")]
    public async Task<IActionResult> UpdateLocalizationEntry(Guid id, [FromBody] LocalizationEntryUpsertRequest req)
    {
        if (RequireAdmin() is { } err) return err;
        if (!await CurrentUserHasPermission("localization.manage")) return Forbid();

        var entry = await db.LocalizationEntries.FindAsync(id);
        if (entry == null) return NotFound(new { success = false, message = "Translation entry not found." });

        var validationError = await ValidateLocalizationEntryRequest(req);
        if (validationError != null) return validationError;

        var key = req.Key.Trim();
        var targetLocale = NormalizeLocale(req.TargetLocale);
        if (await db.LocalizationEntries.AnyAsync(x => x.Id != id && x.Key == key && x.TargetLocale == targetLocale))
            return BadRequest(new { success = false, message = "Translation key already exists for this target locale." });

        entry.Key = key;
        entry.SourceLocale = NormalizeLocale(req.SourceLocale);
        entry.TargetLocale = targetLocale;
        entry.SourceText = req.SourceText.Trim();
        entry.Value = (req.Value ?? string.Empty).Trim();
        entry.Context = string.IsNullOrWhiteSpace(req.Context) ? null : req.Context.Trim();
        entry.IsMachineTranslated = req.IsMachineTranslated;
        entry.LastError = string.IsNullOrWhiteSpace(req.LastError) ? null : req.LastError.Trim();
        entry.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(new { success = true, data = entry, message = "Translation updated." });
    }

    [HttpPost("localization/entries/bulk")]
    public async Task<IActionResult> UpsertLocalizationEntries([FromBody] BulkLocalizationEntriesRequest req)
    {
        if (RequireAdmin() is { } err) return err;
        if (!await CurrentUserHasPermission("localization.manage")) return Forbid();
        if (req.Entries.Count == 0 || req.Entries.Count > 500)
            return BadRequest(new { success = false, message = "Bulk request must contain between 1 and 500 entries." });

        var targetLocales = req.Entries
            .Select(x => NormalizeLocale(x.TargetLocale))
            .Distinct()
            .ToList();
        var enabledLocales = await db.LocaleLanguages
            .Where(x => x.IsEnabled && targetLocales.Contains(x.Code))
            .Select(x => x.Code)
            .ToListAsync();

        if (enabledLocales.Count != targetLocales.Count)
            return BadRequest(new { success = false, message = "One or more target locales are not enabled." });

        await using var transaction = await db.Database.BeginTransactionAsync(HttpContext.RequestAborted);
        var now = DateTime.UtcNow;
        var saved = 0;

        foreach (var item in req.Entries.GroupBy(x => new { x.Key, x.TargetLocale }).Select(x => x.Last()))
        {
            if (string.IsNullOrWhiteSpace(item.Key) || string.IsNullOrWhiteSpace(item.SourceText) || string.IsNullOrWhiteSpace(item.Value))
                continue;

            var key = item.Key.Trim();
            var targetLocale = NormalizeLocale(item.TargetLocale);
            var entry = await db.LocalizationEntries
                .SingleOrDefaultAsync(x => x.Key == key && x.TargetLocale == targetLocale, HttpContext.RequestAborted);

            if (!string.IsNullOrWhiteSpace(entry?.Value))
                continue;

            var sourceLocale = NormalizeLocale(item.SourceLocale);
            var sourceText = item.SourceText.Trim();
            var value = item.Value.Trim();
            var context = string.IsNullOrWhiteSpace(item.Context) ? null : item.Context.Trim();
            var isNew = false;

            if (entry == null)
            {
                entry = new LocalizationEntry
                {
                    Id = Guid.NewGuid(),
                    Key = key,
                    TargetLocale = targetLocale,
                    CreatedAt = now
                };
                db.LocalizationEntries.Add(entry);
                isNew = true;
            }

            var hasChanges = isNew ||
                entry.SourceLocale != sourceLocale ||
                entry.SourceText != sourceText ||
                entry.Value != value ||
                entry.Context != context ||
                entry.IsMachineTranslated != item.IsMachineTranslated ||
                entry.LastError != null;

            if (!hasChanges) continue;

            entry.SourceLocale = sourceLocale;
            entry.SourceText = sourceText;
            entry.Value = value;
            entry.Context = context;
            entry.IsMachineTranslated = item.IsMachineTranslated;
            entry.LastError = null;
            entry.UpdatedAt = now;
            saved++;
        }

        await db.SaveChangesAsync(HttpContext.RequestAborted);
        await transaction.CommitAsync(HttpContext.RequestAborted);
        return Ok(new { success = true, data = new { saved }, message = $"Saved {saved} translations." });
    }

    [HttpDelete("localization/entries/{id}")]
    public async Task<IActionResult> DeleteLocalizationEntry(Guid id)
    {
        if (RequireAdmin() is { } err) return err;
        if (!await CurrentUserHasPermission("localization.manage")) return Forbid();

        var entry = await db.LocalizationEntries.FindAsync(id);
        if (entry == null) return NotFound(new { success = false, message = "Translation entry not found." });

        db.LocalizationEntries.Remove(entry);
        await db.SaveChangesAsync();
        return Ok(new { success = true, message = "Translation deleted." });
    }

    [HttpPost("localization/translate")]
    public async Task<IActionResult> TranslateLocalization([FromBody] LocalizationTranslateRequest req)
    {
        if (RequireAdmin() is { } err) return err;
        if (!await CurrentUserHasPermission("localization.manage")) return Forbid();

        var result = await translationService.TranslateAsync(
            new InternalTranslationRequest(req.SourceLocale, req.TargetLocale, req.Text),
            HttpContext.RequestAborted);

        if (!result.Success)
        {
            return UnprocessableEntity(new
            {
                success = false,
                message = "Internal translation failed.",
                errors = result.Errors,
                chunks = result.Chunks
            });
        }

        return Ok(new
        {
            success = true,
            data = new
            {
                translatedText = result.Text,
                chunks = result.Chunks
            }
        });
    }

    // -----------------------------------------------------------------------
    // Security: Events
    // -----------------------------------------------------------------------

    [HttpGet("security/events")]
    public IActionResult GetSecurityEvents([FromQuery] int count = 200, [FromQuery] string? type = null)
    {
        if (RequireAdmin() is { } err) return err;

        var events = security.GetRecentEvents(count);

        if (!string.IsNullOrEmpty(type) &&
            Enum.TryParse<SecurityEventType>(type, true, out var eventType))
        {
            events = events.Where(e => e.Type == eventType);
        }

        return Ok(new { success = true, data = events });
    }

    // -----------------------------------------------------------------------
    // Security: IP Management
    // -----------------------------------------------------------------------

    [HttpGet("security/blocked-ips")]
    public IActionResult GetBlockedIps()
    {
        if (RequireAdmin() is { } err) return err;
        return Ok(new { success = true, data = security.GetBlockedIps() });
    }

    [HttpPost("security/block-ip")]
    public IActionResult BlockIp([FromBody] BlockIpRequest req)
    {
        if (RequireAdmin() is { } err) return err;

        if (string.IsNullOrWhiteSpace(req.Ip))
            return BadRequest(new { success = false, message = "IP is required." });

        TimeSpan? duration = req.DurationHours.HasValue
            ? TimeSpan.FromHours(req.DurationHours.Value)
            : null;

        security.BlockIp(req.Ip, req.Reason ?? "Blocked by admin", false, duration);
        security.RecordEvent(SecurityEventType.IpManualBlocked, req.Ip,
            $"Admin manually blocked: {req.Reason}");

        return Ok(new { success = true, message = $"IP {req.Ip} has been blocked." });
    }

    [HttpDelete("security/blocked-ips/{ip}")]
    public IActionResult UnblockIp(string ip)
    {
        if (RequireAdmin() is { } err) return err;
        security.UnblockIp(ip);
        return Ok(new { success = true, message = $"IP {ip} has been unblocked." });
    }

    [HttpDelete("security/rate-limit/{ip}")]
    public IActionResult ResetRateLimit(string ip)
    {
        if (RequireAdmin() is { } err) return err;
        security.ResetRateLimit(ip);
        return Ok(new { success = true, message = $"Rate limit cleared for {ip}." });
    }

    [HttpGet("security/stats")]
    public IActionResult GetSecurityStats()
    {
        if (RequireAdmin() is { } err) return err;
        return Ok(new { success = true, data = security.GetStats() });
    }

    // -----------------------------------------------------------------------
    // Security: Persistent block/allow lists (survive restart)
    // -----------------------------------------------------------------------

    // GET /api/v1/admin/security/block-list?kind=1 (1=Blacklist, 2=Whitelist; omit for all)
    [HttpGet("security/block-list")]
    public async Task<IActionResult> GetBlockList([FromQuery] BlockListKind? kind = null)
    {
        if (RequireAdmin() is { } err) return err;
        var items = await blockService.ListAsync(kind, HttpContext.RequestAborted);
        return Ok(new { success = true, data = items });
    }

    [HttpPost("security/block-list")]
    public async Task<IActionResult> AddBlockEntry([FromBody] BlockListEntryRequest req)
    {
        if (RequireAdmin() is { } err) return err;

        if (string.IsNullOrWhiteSpace(req.Value))
            return BadRequest(new { success = false, message = "Value is required." });

        DateTime? expiresAt = req.DurationHours.HasValue
            ? DateTime.UtcNow.AddHours(req.DurationHours.Value)
            : null;

        var entry = await blockService.AddAsync(
            req.ListKind, req.TargetType, req.Value, req.Reason,
            UserContext.GetUserId(User), expiresAt, HttpContext.RequestAborted);

        logger.LogWarning("Admin added {Kind} entry {Type}={Value}", req.ListKind, req.TargetType, req.Value);
        return Ok(new { success = true, data = entry, message = "Entry added." });
    }

    [HttpDelete("security/block-list/{id}")]
    public async Task<IActionResult> RemoveBlockEntry(Guid id)
    {
        if (RequireAdmin() is { } err) return err;
        var ok = await blockService.RemoveAsync(id, HttpContext.RequestAborted);
        if (!ok) return NotFound(new { success = false, message = "Entry not found or already inactive." });
        return Ok(new { success = true, message = "Entry removed." });
    }
}

// -----------------------------------------------------------------------
// Request models
// -----------------------------------------------------------------------

public record BanRequest(string Reason);
public record CreateManagedUserRequest(
    string Email,
    string Password,
    string FirstName,
    string LastName,
    List<Guid> RoleIds);
public record SetUserRolesRequest(List<Guid> RoleIds);
public record RoleUpsertRequest(string Name, string DisplayName, int Level);
public record SetRolePermissionsRequest(List<Guid> PermissionIds);
public record BlockIpRequest(string Ip, string? Reason, double? DurationHours);
public record LocaleLanguageUpsertRequest(
    string Code,
    string DisplayName,
    string? NativeName,
    bool IsEnabled,
    bool IsDefault);
public record LocalizationEntryUpsertRequest(
    string Key,
    string SourceLocale,
    string TargetLocale,
    string SourceText,
    string Value,
    string? Context,
    bool IsMachineTranslated,
    string? LastError);
public record LocalizationTranslateRequest(
    string SourceLocale,
    string TargetLocale,
    string Text);
public record BulkLocalizationEntriesRequest(List<LocalizationEntryUpsertRequest> Entries);
public record BlockListEntryRequest(
    BlockListKind ListKind,
    BlockTargetType TargetType,
    string Value,
    string? Reason,
    double? DurationHours);
