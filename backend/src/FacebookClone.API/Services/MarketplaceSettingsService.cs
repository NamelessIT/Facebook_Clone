using System.Globalization;
using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Policies;
using FacebookClone.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.API.Services;

public class MarketplaceSettingsService(AppDbContext db)
{
    public async Task<decimal> GetDisplayFeeAsync(CancellationToken cancellationToken = default)
    {
        var value = await db.SystemSettings.AsNoTracking()
            .Where(x => x.Key == MarketplacePolicy.DisplayFeeSettingKey)
            .Select(x => x.Value)
            .SingleOrDefaultAsync(cancellationToken);

        return decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var fee)
            && fee >= MarketplacePolicy.MinDisplayFeeVnd
            && fee <= MarketplacePolicy.MaxDisplayFeeVnd
                ? fee
                : MarketplacePolicy.DefaultDisplayFeeVnd;
    }

    public async Task<decimal> UpdateDisplayFeeAsync(
        decimal displayFee,
        Guid actorId,
        CancellationToken cancellationToken = default)
    {
        var setting = await db.SystemSettings.FindAsync(
            [MarketplacePolicy.DisplayFeeSettingKey], cancellationToken);
        var now = DateTime.UtcNow;
        var value = displayFee.ToString(CultureInfo.InvariantCulture);

        if (setting == null)
        {
            db.SystemSettings.Add(new SystemSetting
            {
                Key = MarketplacePolicy.DisplayFeeSettingKey,
                Value = value,
                UpdatedAt = now,
                UpdatedByUserId = actorId
            });
        }
        else
        {
            setting.Value = value;
            setting.UpdatedAt = now;
            setting.UpdatedByUserId = actorId;
        }

        await db.SaveChangesAsync(cancellationToken);
        return displayFee;
    }
}
