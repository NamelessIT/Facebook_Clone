using FacebookClone.Domain.Enums;

namespace FacebookClone.Domain.Entities;

public class LiveSession
{
    public Guid Id { get; set; }
    public Guid OwnerId { get; set; }
    public User Owner { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public PostPrivacy Privacy { get; set; } = PostPrivacy.Public;
    public bool IsShopping { get; set; }
    public LiveSessionStatus Status { get; set; } = LiveSessionStatus.Live;
    public DateTime StartedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public string? RecordingUrl { get; set; }
    public DateTime? RecordingExpiresAt { get; set; }
    public Guid? ConvertedPostId { get; set; }
    public Post? ConvertedPost { get; set; }
    public Guid? EndedByUserId { get; set; }
    public string? EndReason { get; set; }
    public ICollection<LiveComment> Comments { get; set; } = new List<LiveComment>();
}
