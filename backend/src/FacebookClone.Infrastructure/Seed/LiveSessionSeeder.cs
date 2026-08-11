using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.Infrastructure.Seed;

public class LiveSessionSeeder : ISeeder
{
    private static readonly (Guid SessionId, Guid PostId, Guid MediaId, string Title, string Description, string VideoFile)[] Replays =
    [
        (Guid.Parse("71000000-0000-0000-0000-000000000001"), Guid.Parse("72000000-0000-0000-0000-000000000001"), Guid.Parse("73000000-0000-0000-0000-000000000001"), "Bản phát lại: Chào buổi sáng", "Phiên live mẫu để kiểm tra màn hình xem lại và modal Live.", "03318a2d-bd04-4372-8d5f-4f48038f0ec1.mp4"),
        (Guid.Parse("71000000-0000-0000-0000-000000000002"), Guid.Parse("72000000-0000-0000-0000-000000000002"), Guid.Parse("73000000-0000-0000-0000-000000000002"), "Live bán hàng mẫu: Góc công nghệ", "Giới thiệu một số sản phẩm công nghệ trong phiên live mẫu.", "0cd4899a-d43d-46df-977b-9cdce8d642c0.mp4"),
        (Guid.Parse("71000000-0000-0000-0000-000000000003"), Guid.Parse("72000000-0000-0000-0000-000000000003"), Guid.Parse("73000000-0000-0000-0000-000000000003"), "Trò chuyện cuối tuần", "Bản phát lại công khai dùng cho kiểm thử giao diện Live.", "1c5a66fa-4b19-4057-861e-718e1c36e36e.mp4")
    ];

    public async Task SeedAsync(AppDbContext context)
    {
        var owners = await context.Users
            .Where(user => !user.IsDeleted && !user.IsAdmin)
            .OrderBy(user => user.CreatedAt)
            .Take(Replays.Length)
            .ToListAsync();
        if (owners.Count == 0) return;

        var now = DateTime.UtcNow;
        var added = 0;
        for (var index = 0; index < Replays.Length; index++)
        {
            var replay = Replays[index];
            if (await context.LiveSessions.AnyAsync(session => session.Id == replay.SessionId)) continue;

            var owner = owners[index % owners.Count];
            var endedAt = now.AddDays(-(index + 1));
            var recordingUrl = $"/uploads/reels/{replay.VideoFile}";
            if (!await context.Posts.IgnoreQueryFilters().AnyAsync(post => post.Id == replay.PostId))
            {
                context.Posts.Add(new Post
                {
                    Id = replay.PostId,
                    UserId = owner.Id,
                    Content = replay.Title,
                    Privacy = PostPrivacy.Public,
                    PostType = PostType.Normal,
                    CreatedAt = endedAt,
                    UpdatedAt = endedAt,
                    IsDeleted = false,
                    Medias =
                    [
                        new MediaAttachment
                        {
                            Id = replay.MediaId,
                            Url = recordingUrl,
                            MediaType = MediaType.Video,
                            CreatedAt = endedAt
                        }
                    ]
                });
            }

            context.LiveSessions.Add(new LiveSession
            {
                Id = replay.SessionId,
                OwnerId = owner.Id,
                Title = replay.Title,
                Description = replay.Description,
                Privacy = PostPrivacy.Public,
                IsShopping = index == 1,
                Status = LiveSessionStatus.Ended,
                StartedAt = endedAt.AddMinutes(-35 - index * 10),
                EndedAt = endedAt,
                UpdatedAt = endedAt,
                RecordingUrl = recordingUrl,
                ConvertedPostId = replay.PostId,
                EndedByUserId = owner.Id,
                EndReason = "Phiên live mẫu đã kết thúc bình thường."
            });
            added++;
        }

        if (added > 0)
        {
            await context.SaveChangesAsync();
            Console.WriteLine($"Seeded {added} live replay sessions for UI testing.");
        }
    }
}
