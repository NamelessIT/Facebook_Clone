using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.Infrastructure.Seed;

public class ReelSeeder : ISeeder
{
    private const int SeedReelCount = 50;
    private const string MarkerPrefix = "\u2063\u2064\u2063";
    private const string LegacyInvisibleMarkerPrefix = "\u2063seed-reel:";
    private const string LegacyVisibleMarkerPrefix = "[seed-reel:";
    private const char MarkerUnit = '\u2060';
    private const char MarkerEnd = '\u2064';
    private const char LegacyInvisibleMarkerEnd = '\u2063';

    private static readonly string[] VideoFiles =
    [
        "03318a2d-bd04-4372-8d5f-4f48038f0ec1.mp4",
        "0cd4899a-d43d-46df-977b-9cdce8d642c0.mp4",
        "1c5a66fa-4b19-4057-861e-718e1c36e36e.mp4",
        "8f40845a-5344-4bcc-803e-c63537958fff.mp4"
    ];

    private static readonly string[] ReelTitles =
    [
        "Khoảnh khắc cuối ngày",
        "Một vòng thành phố",
        "Góc nhỏ đầy cảm hứng",
        "Chuyến đi cuối tuần",
        "Hôm nay ăn gì?",
        "Nhịp sống thường ngày",
        "Cùng học một mẹo mới",
        "Bản nhạc cho buổi chiều",
        "Chuyện vui trong 30 giây",
        "Lưu lại một ngày đẹp"
    ];

    public async Task SeedAsync(AppDbContext context)
    {
        var users = await context.Users
            .Where(user => !user.IsDeleted && !user.IsAdmin)
            .OrderBy(user => user.Email)
            .ToListAsync();

        if (users.Count == 0)
        {
            Console.WriteLine("No users found. Skipping reel seed.");
            return;
        }

        var existingSeedReels = (await context.Reels.ToListAsync())
            .Where(reel => reel.Title != null && IsSeedTitle(reel.Title))
            .ToList();
        var existingNumbers = existingSeedReels
            .Select(reel => TryReadMarkerNumber(reel.Title!))
            .Where(number => number.HasValue)
            .Select(number => number!.Value)
            .ToHashSet();

        foreach (var legacyReel in existingSeedReels.Where(reel => !reel.Title!.StartsWith(MarkerPrefix, StringComparison.Ordinal)))
        {
            var currentTitle = legacyReel.Title!;
            var number = TryReadMarkerNumber(currentTitle);
            var markerEnd = FindMarkerEnd(currentTitle);
            if (number.HasValue && markerEnd >= 0)
            {
                legacyReel.Title = $"{CreateMarker(number.Value)}{currentTitle[(markerEnd + 1)..].TrimStart()}";
            }
        }
        var now = DateTime.UtcNow;
        var reelsToAdd = new List<Reel>();

        for (var number = 1; number <= SeedReelCount; number++)
        {
            if (existingNumbers.Contains(number)) continue;

            var createdAt = now.AddHours(-(number * 5));
            reelsToAdd.Add(new Reel
            {
                Id = Guid.NewGuid(),
                UserId = users[(number - 1) % users.Count].Id,
                VideoUrl = $"/uploads/reels/{VideoFiles[(number - 1) % VideoFiles.Length]}",
                ThumbnailUrl = $"https://picsum.photos/seed/fb-reel-{number:00}/540/960",
                Title = $"{CreateMarker(number)}{ReelTitles[(number - 1) % ReelTitles.Length]}",
                Description = $"Reel thử nghiệm số {number:00} cho Facebook Clone.",
                Caption = $"{ReelTitles[(number - 1) % ReelTitles.Length]} #{number:00}",
                Privacy = PostPrivacy.Public,
                Duration = 15 + number % 45,
                ViewsCount = number * 37,
                CreatedAt = createdAt,
                UpdatedAt = createdAt,
                IsDeleted = false
            });
        }

        if (reelsToAdd.Count > 0)
        {
            await context.Reels.AddRangeAsync(reelsToAdd);
            await context.SaveChangesAsync();
            Console.WriteLine($"Seeded {reelsToAdd.Count} missing test reels.");
        }
        else
        {
            Console.WriteLine("Test reels already seeded.");
        }
    }

    private static int? TryReadMarkerNumber(string title)
    {
        if (title.StartsWith(LegacyVisibleMarkerPrefix, StringComparison.Ordinal))
        {
            var end = title.IndexOf(']');
            return end > LegacyVisibleMarkerPrefix.Length
                && int.TryParse(title[LegacyVisibleMarkerPrefix.Length..end], out var number)
                    ? number
                    : null;
        }

        if (title.StartsWith(LegacyInvisibleMarkerPrefix, StringComparison.Ordinal))
        {
            var end = title.IndexOf(LegacyInvisibleMarkerEnd, LegacyInvisibleMarkerPrefix.Length);
            return end > LegacyInvisibleMarkerPrefix.Length
                && int.TryParse(title[LegacyInvisibleMarkerPrefix.Length..end], out var number)
                    ? number
                    : null;
        }

        if (!title.StartsWith(MarkerPrefix, StringComparison.Ordinal)) return null;
        if (title.Length <= MarkerPrefix.Length) return null;
        var markerEnd = title.IndexOf(MarkerEnd, MarkerPrefix.Length);
        if (markerEnd <= MarkerPrefix.Length) return null;
        var units = title[MarkerPrefix.Length..markerEnd];
        return units.All(character => character == MarkerUnit) ? units.Length : null;
    }

    private static int FindMarkerEnd(string title)
    {
        if (title.StartsWith(LegacyVisibleMarkerPrefix, StringComparison.Ordinal)) return title.IndexOf(']');
        if (title.StartsWith(LegacyInvisibleMarkerPrefix, StringComparison.Ordinal)) return title.IndexOf(LegacyInvisibleMarkerEnd, LegacyInvisibleMarkerPrefix.Length);
        if (title.Length <= MarkerPrefix.Length) return -1;
        return title.IndexOf(MarkerEnd, MarkerPrefix.Length);
    }

    private static string CreateMarker(int number) => $"{MarkerPrefix}{new string(MarkerUnit, number)}{MarkerEnd}";

    private static bool IsSeedTitle(string title) => title.StartsWith(MarkerPrefix, StringComparison.Ordinal)
        || title.StartsWith(LegacyInvisibleMarkerPrefix, StringComparison.Ordinal)
        || title.StartsWith(LegacyVisibleMarkerPrefix, StringComparison.Ordinal);
}
