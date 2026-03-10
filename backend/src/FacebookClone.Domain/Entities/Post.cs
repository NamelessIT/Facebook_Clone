using FacebookClone.Domain.Enums;

namespace FacebookClone.Domain.Entities;

public class Post
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Content { get; set; } = null!;

    public PostPrivacy Privacy { get; set; }
    public PostType PostType { get; set; }

    public Guid? GroupId { get; set; }

    public Guid? SharedPostId { get; set; }
    public Post? SharedPost { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public bool IsDeleted { get; set; }

    /* Navigation */
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    public ICollection<Reaction> Reactions { get; set; } = new List<Reaction>();
    
    // 👇 THÊM DÒNG NÀY ĐỂ POST CÓ THỂ CHỨA NHIỀU MEDIA
    public ICollection<MediaAttachment> Medias { get; set; } = new List<MediaAttachment>();
}
