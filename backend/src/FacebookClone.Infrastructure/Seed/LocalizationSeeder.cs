using FacebookClone.Domain.Constants;
using FacebookClone.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.Infrastructure.Seed;

public class LocalizationSeeder : ISeeder
{
    private static readonly (string Code, string DisplayName, string NativeName, bool IsDefault)[] Languages =
    [
        (SharedConstants.Localization.DefaultLocale, "Vietnamese", "Tiếng Việt", true),
        (SharedConstants.Localization.FallbackLocale, "English", "English", false),
    ];

    public async Task SeedAsync(AppDbContext context)
    {
        var now = DateTime.UtcNow;

        foreach (var item in Languages)
        {
            var language = await context.LocaleLanguages.SingleOrDefaultAsync(x => x.Code == item.Code);
            if (language == null)
            {
                context.LocaleLanguages.Add(new LocaleLanguage
                {
                    Id = Guid.NewGuid(),
                    Code = item.Code,
                    DisplayName = item.DisplayName,
                    NativeName = item.NativeName,
                    IsDefault = item.IsDefault,
                    IsEnabled = true,
                    CreatedAt = now,
                    UpdatedAt = now
                });
                continue;
            }

            language.DisplayName = item.DisplayName;
            language.NativeName = item.NativeName;
            language.IsDefault = item.IsDefault;
            language.IsEnabled = true;
            language.UpdatedAt = now;
        }

        await context.SaveChangesAsync();

        var catalogKeys = LocalizationCatalog.Entries.Select(x => x.Key).Distinct().ToArray();
        var catalogLocales = LocalizationCatalog.Entries.Select(x => x.TargetLocale).Distinct().ToArray();
        var existingEntries = await context.LocalizationEntries
            .Where(x => catalogKeys.Contains(x.Key) && catalogLocales.Contains(x.TargetLocale))
            .ToDictionaryAsync(x => $"{x.Key}\u001f{x.TargetLocale}");

        foreach (var item in LocalizationCatalog.Entries)
        {
            var lookupKey = $"{item.Key}\u001f{item.TargetLocale}";
            if (existingEntries.TryGetValue(lookupKey, out var existing))
            {
                // Keep the admin-managed translation, but refresh catalog metadata.
                var previousSourceText = existing.SourceText;
                existing.SourceLocale = LocalizationCatalog.SourceLocale;
                existing.SourceText = item.SourceText;
                existing.Context = item.Context;
                var isCatalogFallback =
                    string.Equals(existing.Value, previousSourceText, StringComparison.Ordinal) ||
                    string.Equals(existing.Value, item.SourceText, StringComparison.Ordinal);
                if ((string.IsNullOrWhiteSpace(existing.Value) || isCatalogFallback) && !string.IsNullOrWhiteSpace(item.Value))
                {
                    existing.Value = item.Value;
                    existing.IsMachineTranslated = false;
                }
                existing.UpdatedAt = now;
                continue;
            }

            context.LocalizationEntries.Add(new LocalizationEntry
            {
                Id = Guid.NewGuid(),
                Key = item.Key,
                SourceLocale = LocalizationCatalog.SourceLocale,
                TargetLocale = item.TargetLocale,
                SourceText = item.SourceText,
                Value = item.Value,
                Context = item.Context,
                IsMachineTranslated = false,
                CreatedAt = now,
                UpdatedAt = now
            });
        }
    }
}
