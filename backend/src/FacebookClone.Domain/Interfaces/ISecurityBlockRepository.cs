using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;

namespace FacebookClone.Domain.Interfaces;

public interface ISecurityBlockRepository
{
    /// <summary>All currently-active, non-expired entries (used to build the enforcement set).</summary>
    Task<List<SecurityBlockEntry>> GetActiveAsync(CancellationToken ct = default);

    /// <summary>All entries (admin listing), optionally filtered by list kind.</summary>
    Task<List<SecurityBlockEntry>> GetAllAsync(BlockListKind? kind = null, CancellationToken ct = default);

    Task<SecurityBlockEntry?> GetByIdAsync(Guid id, CancellationToken ct = default);

    Task AddAsync(SecurityBlockEntry entry, CancellationToken ct = default);

    /// <summary>Soft-deactivate (keeps audit trail). Returns false if not found/already inactive.</summary>
    Task<bool> DeactivateAsync(Guid id, CancellationToken ct = default);
}
