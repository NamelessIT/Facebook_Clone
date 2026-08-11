namespace FacebookClone.Domain.Entities;

public class LiveComment
{
    public Guid Id { get; set; }
    public Guid LiveSessionId { get; set; }
    public LiveSession LiveSession { get; set; } = null!;
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public Guid ClientRequestId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
