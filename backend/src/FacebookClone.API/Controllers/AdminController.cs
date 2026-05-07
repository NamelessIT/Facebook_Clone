using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FacebookClone.API.Services;
using FacebookClone.API.Common;
using FacebookClone.Infrastructure;

namespace FacebookClone.API.Controllers;

[ApiController]
[Route("api/v1/admin")]
[Authorize]
public class AdminController(
    AppDbContext db,
    ISecurityService security,
    ILogger<AdminController> logger) : ControllerBase
{
    // -----------------------------------------------------------------------
    // Guard: only admins may use this controller
    // -----------------------------------------------------------------------
    private IActionResult? RequireAdmin()
    {
        var userId = UserContext.GetUserId(User);
        var user = db.Users.AsNoTracking().FirstOrDefault(u => u.Id == userId);
        if (user == null || !user.IsAdmin)
            return Forbid();
        return null;
    }

    // -----------------------------------------------------------------------
    // Dashboard
    // -----------------------------------------------------------------------

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        if (RequireAdmin() is { } err) return err;

        var now = DateTime.UtcNow;
        var totalUsers = await db.Users.CountAsync(u => !u.IsDeleted);
        var activeToday = await db.Users.CountAsync(u => !u.IsDeleted && u.IsOnline);
        var newUsersLast7d = await db.Users.CountAsync(u => !u.IsDeleted && u.CreatedAt >= now.AddDays(-7));
        var totalPosts = await db.Posts.CountAsync(p => !p.IsDeleted);
        var postsToday = await db.Posts.CountAsync(p => !p.IsDeleted && p.CreatedAt >= now.Date);
        var totalReels = await db.Reels.CountAsync();
        var bannedUsers = await db.Users.CountAsync(u => u.IsBanned);
        var secStats = security.GetStats();

        return Ok(new
        {
            success = true,
            data = new
            {
                users = new { total = totalUsers, activeNow = activeToday, newLast7Days = newUsersLast7d, banned = bannedUsers },
                content = new { totalPosts, postsToday, totalReels },
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

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new
            {
                u.Id, u.FirstName, u.LastName, u.Email,
                u.AvatarUrl, u.IsOnline, u.IsAdmin, u.IsBanned,
                u.BanReason, u.BannedAt, u.CreatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            success = true,
            data = items,
            pagination = new { page, pageSize, total, totalPages = (int)Math.Ceiling((double)total / pageSize) }
        });
    }

    [HttpPut("users/{id}/ban")]
    public async Task<IActionResult> BanUser(Guid id, [FromBody] BanRequest req)
    {
        if (RequireAdmin() is { } err) return err;

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

        var target = await db.Users.FindAsync(id);
        if (target == null) return NotFound(new { success = false, message = "User not found." });

        target.IsAdmin = !target.IsAdmin;
        await db.SaveChangesAsync();

        return Ok(new { success = true, isAdmin = target.IsAdmin, message = $"User admin status: {target.IsAdmin}" });
    }

    [HttpDelete("users/{id}")]
    public async Task<IActionResult> SoftDeleteUser(Guid id)
    {
        if (RequireAdmin() is { } err) return err;

        var target = await db.Users.FindAsync(id);
        if (target == null) return NotFound(new { success = false, message = "User not found." });
        if (target.IsAdmin) return BadRequest(new { success = false, message = "Cannot delete an admin." });

        target.IsDeleted = true;
        await db.SaveChangesAsync();

        logger.LogWarning("Admin soft-deleted user {UserId}", id);
        return Ok(new { success = true, message = "User deleted." });
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
}

// -----------------------------------------------------------------------
// Request models
// -----------------------------------------------------------------------

public record BanRequest(string Reason);
public record BlockIpRequest(string Ip, string? Reason, double? DurationHours);
