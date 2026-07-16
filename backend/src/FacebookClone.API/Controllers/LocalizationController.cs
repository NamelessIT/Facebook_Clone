using FacebookClone.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.API.Controllers;

[ApiController]
[Route("api/v1/localization")]
public class LocalizationController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? locale = null)
    {
        var languages = await db.LocaleLanguages
            .AsNoTracking()
            .Where(x => x.IsEnabled)
            .OrderByDescending(x => x.IsDefault)
            .ThenBy(x => x.DisplayName)
            .Select(x => new
            {
                x.Code,
                x.DisplayName,
                x.NativeName,
                x.IsDefault
            })
            .ToListAsync(HttpContext.RequestAborted);

        var selectedLocale = string.IsNullOrWhiteSpace(locale)
            ? languages.FirstOrDefault(x => x.IsDefault)?.Code ?? "vi"
            : locale.Trim().ToLowerInvariant();

        if (!languages.Any(x => x.Code == selectedLocale))
        {
            selectedLocale = languages.FirstOrDefault(x => x.IsDefault)?.Code ?? "vi";
        }

        var entries = await db.LocalizationEntries
            .AsNoTracking()
            .Where(x => x.TargetLocale == selectedLocale)
            .OrderBy(x => x.Key)
            .Select(x => new { x.Key, x.Value })
            .ToListAsync(HttpContext.RequestAborted);

        return Ok(new
        {
            success = true,
            data = new
            {
                locale = selectedLocale,
                languages,
                translations = entries.ToDictionary(x => x.Key, x => x.Value)
            }
        });
    }
}
