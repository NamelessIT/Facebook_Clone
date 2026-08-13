using FacebookClone.Domain.Enums;

namespace FacebookClone.Domain.Entities;

public class ModerationReport
{
    public Guid Id { get; set; }
    public Guid ReporterId { get; set; }
    public User Reporter { get; set; } = null!;
    public ModerationTargetType TargetType { get; set; }
    public Guid TargetId { get; set; }
    public Guid TargetOwnerId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? Details { get; set; }
    public ModerationReportStatus Status { get; set; } = ModerationReportStatus.Pending;
    public ModerationAction ResolutionAction { get; set; } = ModerationAction.None;
    public string? ResolutionNote { get; set; }
    public Guid? ReviewedById { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public DateTime ReviewDueAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public DateTime? PunishmentEndsAt { get; set; }
    public DateTime? RestoredAt { get; set; }
    public Guid? RestoredById { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public ICollection<ModerationReportEvidence> Evidence { get; set; } = new List<ModerationReportEvidence>();
}
