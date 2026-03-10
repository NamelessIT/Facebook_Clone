using FacebookClone.Domain.Enums;

namespace FacebookClone.Domain.Entities;

public class Reaction
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    // 👇 1. Sửa Post thành Nullable (Sẽ rỗng nếu người dùng thả tim vào Comment)
    public Guid? PostId { get; set; }
    public Post? Post { get; set; }

    // 👇 2. Thêm Comment (Sẽ rỗng nếu người dùng thả tim vào Post)
    public Guid? CommentId { get; set; }
    public Comment? Comment { get; set; }

    public ReactionType ReactionType { get; set; }

    public DateTime CreatedAt { get; set; }
}