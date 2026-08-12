using FacebookClone.Domain.Constants;
using FacebookClone.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.API.Services;

public class InternalTranslationService(AppDbContext db) : IInternalTranslationService
{
    private static readonly Dictionary<(string Source, string Target, string Text), string> BuiltInDictionary =
        new(StringTupleComparer.OrdinalIgnoreCase)
        {
            [("vi", "en", "Đăng nhập")] = "Log in",
            [("vi", "en", "Đăng xuất")] = "Log out",
            [("vi", "en", "Bạn bè")] = "Friends",
            [("vi", "en", "Đã lưu")] = "Saved",
            [("vi", "en", "Bài viết")] = "Posts",
            [("vi", "en", "Người dùng")] = "Users",
            [("vi", "en", "Bảo mật")] = "Security",
            [("vi", "en", "Bản dịch")] = "Localization",
            [("vi", "en", "Tất cả")] = "All",
            [("vi", "en", "Tìm kiếm")] = "Search",
            [("en", "vi", "Log in")] = "Đăng nhập",
            [("en", "vi", "Log out")] = "Đăng xuất",
            [("en", "vi", "Friends")] = "Bạn bè",
            [("en", "vi", "Saved")] = "Đã lưu",
            [("en", "vi", "Posts")] = "Bài viết",
            [("en", "vi", "Users")] = "Người dùng",
            [("en", "vi", "Security")] = "Bảo mật",
            [("en", "vi", "Localization")] = "Bản dịch",
            [("en", "vi", "All")] = "Tất cả",
            [("en", "vi", "Search")] = "Tìm kiếm",
        };

    public async Task<InternalTranslationResult> TranslateAsync(
        InternalTranslationRequest request,
        CancellationToken cancellationToken = default)
    {
        var sourceLocale = NormalizeLocale(request.SourceLocale);
        var targetLocale = NormalizeLocale(request.TargetLocale);
        var text = request.Text.Trim();

        if (string.IsNullOrWhiteSpace(sourceLocale) || string.IsNullOrWhiteSpace(targetLocale))
        {
            return Fail("Source locale and target locale are required.");
        }

        if (string.IsNullOrWhiteSpace(text))
        {
            return Fail("Text is required.");
        }

        if (sourceLocale == targetLocale)
        {
            return new InternalTranslationResult(true, text, [text], []);
        }

        var targetExists = await db.LocaleLanguages
            .AsNoTracking()
            .AnyAsync(x => x.Code == targetLocale && x.IsEnabled, cancellationToken);
        if (!targetExists)
        {
            return Fail($"Target locale '{targetLocale}' is not enabled in LocaleLanguages.");
        }

        var chunks = ChunkText(text, SharedConstants.Localization.MaxTranslationChunkChars).ToList();
        var translated = new List<string>();
        var errors = new List<string>();

        for (var i = 0; i < chunks.Count; i++)
        {
            var chunk = chunks[i];
            var value = await FindStoredTranslationAsync(sourceLocale, targetLocale, chunk, cancellationToken)
                ?? InternalTranslationCatalog.Find(sourceLocale, targetLocale, chunk)
                ?? FindBuiltInTranslation(sourceLocale, targetLocale, chunk);

            if (string.IsNullOrWhiteSpace(value))
            {
                errors.Add(
                    $"Chunk {i + 1}/{chunks.Count} has no internal translation rule. Add a manual entry for this text or translate the chunk manually.");
                continue;
            }

            translated.Add(value);
        }

        if (errors.Count > 0)
        {
            return new InternalTranslationResult(false, null, chunks, errors);
        }

        return new InternalTranslationResult(true, string.Join("\n\n", translated), chunks, []);
    }

    private async Task<string?> FindStoredTranslationAsync(
        string sourceLocale,
        string targetLocale,
        string text,
        CancellationToken cancellationToken)
    {
        var normalized = text.ToLower();
        return await db.LocalizationEntries
            .AsNoTracking()
            .Where(x => x.SourceLocale == sourceLocale && x.TargetLocale == targetLocale)
            .Where(x => x.SourceText.ToLower() == normalized || x.Key.ToLower() == normalized)
            .Select(x => x.Value)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static string? FindBuiltInTranslation(string sourceLocale, string targetLocale, string text)
    {
        return BuiltInDictionary.TryGetValue((sourceLocale, targetLocale, text.Trim()), out var value)
            ? value
            : null;
    }

    private static IEnumerable<string> ChunkText(string text, int maxChars)
    {
        if (text.Length <= maxChars)
        {
            yield return text;
            yield break;
        }

        var paragraphs = text.Replace("\r\n", "\n").Split("\n\n", StringSplitOptions.RemoveEmptyEntries);
        var buffer = "";

        foreach (var paragraph in paragraphs)
        {
            if (paragraph.Length > maxChars)
            {
                foreach (var sentenceChunk in ChunkLongParagraph(paragraph, maxChars))
                {
                    if (!string.IsNullOrWhiteSpace(buffer))
                    {
                        yield return buffer.Trim();
                        buffer = "";
                    }
                    yield return sentenceChunk;
                }
                continue;
            }

            var candidate = string.IsNullOrWhiteSpace(buffer) ? paragraph : $"{buffer}\n\n{paragraph}";
            if (candidate.Length <= maxChars)
            {
                buffer = candidate;
            }
            else
            {
                yield return buffer.Trim();
                buffer = paragraph;
            }
        }

        if (!string.IsNullOrWhiteSpace(buffer))
        {
            yield return buffer.Trim();
        }
    }

    private static IEnumerable<string> ChunkLongParagraph(string paragraph, int maxChars)
    {
        var remaining = paragraph.Trim();
        while (remaining.Length > maxChars)
        {
            var splitAt = remaining.LastIndexOfAny(['.', '!', '?', ';', ','], maxChars - 1);
            if (splitAt < maxChars / 2) splitAt = maxChars;

            yield return remaining[..splitAt].Trim();
            remaining = remaining[splitAt..].Trim();
        }

        if (!string.IsNullOrWhiteSpace(remaining))
        {
            yield return remaining;
        }
    }

    private static string NormalizeLocale(string value) => value.Trim().ToLowerInvariant();

    private static InternalTranslationResult Fail(string error) => new(false, null, [], [error]);

    private sealed class StringTupleComparer : IEqualityComparer<(string Source, string Target, string Text)>
    {
        public static readonly StringTupleComparer OrdinalIgnoreCase = new();

        public bool Equals((string Source, string Target, string Text) x, (string Source, string Target, string Text) y)
        {
            return string.Equals(x.Source, y.Source, StringComparison.OrdinalIgnoreCase)
                && string.Equals(x.Target, y.Target, StringComparison.OrdinalIgnoreCase)
                && string.Equals(x.Text, y.Text, StringComparison.OrdinalIgnoreCase);
        }

        public int GetHashCode((string Source, string Target, string Text) obj)
        {
            return HashCode.Combine(
                StringComparer.OrdinalIgnoreCase.GetHashCode(obj.Source),
                StringComparer.OrdinalIgnoreCase.GetHashCode(obj.Target),
                StringComparer.OrdinalIgnoreCase.GetHashCode(obj.Text));
        }
    }
}
