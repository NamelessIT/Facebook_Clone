namespace FacebookClone.Domain.Entities;

public class ModerationReportEvidence
{
    public Guid Id { get; set; }
    public Guid ModerationReportId { get; set; }
    public ModerationReport ModerationReport { get; set; } = null!;
    public string FileUrl { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public DateTime CreatedAt { get; set; }
}
