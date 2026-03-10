namespace FacebookClone.Domain.Entities;

public class Comment
{
    public Guid Id { get; set; }

    public Guid PostId { get; set; }
    public Post Post { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid? ParentCommentId { get; set; }
    public Comment? ParentComment { get; set; }

    public string Content { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public bool IsDeleted { get; set; }

    /* Navigation */
    public ICollection<Comment> Replies { get; set; } = new List<Comment>();

    // 👇 THÊM DÒNG NÀY ĐỂ COMMENT CŨNG CÓ THỂ CHỨA NHIỀU MEDIA
    public ICollection<MediaAttachment> Medias { get; set; } = new List<MediaAttachment>();

    // 👇 THÊM DÒNG NÀY: Để đếm và lấy danh sách reaction của Comment
    public ICollection<Reaction> Reactions { get; set; } = new List<Reaction>();
}
