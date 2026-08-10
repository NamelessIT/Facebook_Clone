using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.Infrastructure.Seed;

public class PostSeeder : ISeeder
{
    private const int SeedPostCount = 50;
    private const string MarkerPrefix = "\u2063\u2063\u2064";
    private const string LegacyInvisibleMarkerPrefix = "\u2063seed-post:";
    private const string LegacyVisibleMarkerPrefix = "[seed-post:";
    private const char MarkerUnit = '\u2060';
    private const char MarkerEnd = '\u2064';
    private const char LegacyInvisibleMarkerEnd = '\u2063';

    private static readonly string[] PostContents =
    [
        "Một buổi sáng đầy năng lượng cùng ly cà phê quen thuộc ☕",
        "Góc làm việc hôm nay — đơn giản nhưng đủ cảm hứng.",
        "Cuối tuần dành thời gian khám phá một nơi thật mới.",
        "Chia sẻ một chút niềm vui nhỏ trong ngày ✨",
        "Học thêm một điều mới mỗi ngày là cách tốt nhất để tiến bộ.",
        "Bữa tối ấm cúng cùng gia đình và những câu chuyện vui.",
        "Hoàng hôn hôm nay đẹp đến mức phải dừng lại ngắm nhìn.",
        "Một playlist hay có thể thay đổi cả tâm trạng.",
        "Hoàn thành mục tiêu tuần này sớm hơn dự kiến!",
        "Lưu lại khoảnh khắc bình yên giữa một ngày bận rộn."
    ];

    public async Task SeedAsync(AppDbContext context)
    {
        var users = await context.Users
            .Where(user => !user.IsDeleted && !user.IsAdmin)
            .OrderBy(user => user.Email)
            .ToListAsync();

        if (users.Count == 0)
        {
            Console.WriteLine("No users found. Skipping post seed.");
            return;
        }

        var existingSeedPosts = (await context.Posts.ToListAsync())
            .Where(post => IsSeedContent(post.Content))
            .ToList();
        var existingNumbers = existingSeedPosts
            .Select(post => TryReadMarkerNumber(post.Content))
            .Where(number => number.HasValue)
            .Select(number => number!.Value)
            .ToHashSet();

        foreach (var legacyPost in existingSeedPosts.Where(post => !post.Content.StartsWith(MarkerPrefix, StringComparison.Ordinal)))
        {
            var number = TryReadMarkerNumber(legacyPost.Content);
            var markerEnd = FindMarkerEnd(legacyPost.Content);
            if (number.HasValue && markerEnd >= 0)
            {
                legacyPost.Content = $"{CreateMarker(number.Value)}{legacyPost.Content[(markerEnd + 1)..].TrimStart()}";
            }
        }
        var now = DateTime.UtcNow;
        var postsToAdd = new List<Post>();

        for (var number = 1; number <= SeedPostCount; number++)
        {
            if (existingNumbers.Contains(number)) continue;

            var author = users[(number - 1) % users.Count];
            var createdAt = now.AddYears(-((number - 1) % 3 + 1)).AddMinutes(-(number * 17));
            var marker = CreateMarker(number);
            var post = new Post
            {
                Id = Guid.NewGuid(),
                UserId = author.Id,
                Content = $"{marker}{PostContents[(number - 1) % PostContents.Length]}",
                Privacy = number % 7 == 0 ? PostPrivacy.Friends : PostPrivacy.Public,
                PostType = PostType.Normal,
                CreatedAt = createdAt,
                UpdatedAt = createdAt,
                IsDeleted = false
            };

            if (number % 3 != 0)
            {
                post.Medias.Add(new MediaAttachment
                {
                    Id = Guid.NewGuid(),
                    Url = $"https://picsum.photos/seed/fb-post-{number:00}/960/720",
                    MediaType = MediaType.Image,
                    CreatedAt = createdAt
                });
            }

            postsToAdd.Add(post);
        }

        if (postsToAdd.Count > 0)
        {
            await context.Posts.AddRangeAsync(postsToAdd);
            await context.SaveChangesAsync();
            Console.WriteLine($"Seeded {postsToAdd.Count} missing test posts.");
        }
        else
        {
            Console.WriteLine("Test posts already seeded.");
        }
    }

    private static int? TryReadMarkerNumber(string content)
    {
        if (content.StartsWith(LegacyVisibleMarkerPrefix, StringComparison.Ordinal))
        {
            var end = content.IndexOf(']');
            return end > LegacyVisibleMarkerPrefix.Length
                && int.TryParse(content[LegacyVisibleMarkerPrefix.Length..end], out var number)
                    ? number
                    : null;
        }

        if (content.StartsWith(LegacyInvisibleMarkerPrefix, StringComparison.Ordinal))
        {
            var end = content.IndexOf(LegacyInvisibleMarkerEnd, LegacyInvisibleMarkerPrefix.Length);
            return end > LegacyInvisibleMarkerPrefix.Length
                && int.TryParse(content[LegacyInvisibleMarkerPrefix.Length..end], out var number)
                    ? number
                    : null;
        }

        if (!content.StartsWith(MarkerPrefix, StringComparison.Ordinal)) return null;
        if (content.Length <= MarkerPrefix.Length) return null;
        var markerEnd = content.IndexOf(MarkerEnd, MarkerPrefix.Length);
        if (markerEnd <= MarkerPrefix.Length) return null;
        var units = content[MarkerPrefix.Length..markerEnd];
        return units.All(character => character == MarkerUnit) ? units.Length : null;
    }

    private static int FindMarkerEnd(string content)
    {
        if (content.StartsWith(LegacyVisibleMarkerPrefix, StringComparison.Ordinal)) return content.IndexOf(']');
        if (content.StartsWith(LegacyInvisibleMarkerPrefix, StringComparison.Ordinal)) return content.IndexOf(LegacyInvisibleMarkerEnd, LegacyInvisibleMarkerPrefix.Length);
        if (content.Length <= MarkerPrefix.Length) return -1;
        return content.IndexOf(MarkerEnd, MarkerPrefix.Length);
    }

    private static string CreateMarker(int number) => $"{MarkerPrefix}{new string(MarkerUnit, number)}{MarkerEnd}";

    private static bool IsSeedContent(string content) => content.StartsWith(MarkerPrefix, StringComparison.Ordinal)
        || content.StartsWith(LegacyInvisibleMarkerPrefix, StringComparison.Ordinal)
        || content.StartsWith(LegacyVisibleMarkerPrefix, StringComparison.Ordinal);
}
