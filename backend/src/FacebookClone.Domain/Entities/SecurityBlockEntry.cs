using FacebookClone.Domain.Enums;

namespace FacebookClone.Domain.Entities;

/// <summary>
/// Persistent security list entry (blacklist / whitelist) for IP, user, or email.
/// Survives restarts (unlike the in-memory SecurityService state).
/// </summary>
public class SecurityBlockEntry
{
    public Guid Id { get; set; }

    public BlockListKind ListKind { get; set; }
    public BlockTargetType TargetType { get; set; }

    /// <summary>The IP address, user id (as string), or email being listed.</summary>
    public string Value { get; set; } = null!;

    public string? Reason { get; set; }

    /// <summary>True = created manually by an admin; false = automatic (e.g. abuse detection).</summary>
    public bool IsManual { get; set; } = true;

    public bool IsActive { get; set; } = true;

    /// <summary>Optional expiry; null = permanent until removed.</summary>
    public DateTime? ExpiresAt { get; set; }

    public Guid? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? RemovedAt { get; set; }
}
