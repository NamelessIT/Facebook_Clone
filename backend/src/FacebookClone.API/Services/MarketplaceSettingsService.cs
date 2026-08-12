using System.Globalization;
using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Policies;
using FacebookClone.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.API.Services;

public class MarketplaceSettingsService(AppDbContext db)
{
    private static readonly string[] PaymentSettingKeys =
    [
        MarketplacePolicy.PaymentBankBinSettingKey,
        MarketplacePolicy.PaymentBankNameSettingKey,
        MarketplacePolicy.PaymentAccountNumberSettingKey,
        MarketplacePolicy.PaymentAccountNameSettingKey,
        MarketplacePolicy.PaymentSupportEmailSettingKey
    ];

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

    public async Task<MarketplacePaymentSettings> GetPaymentSettingsAsync(
        CancellationToken cancellationToken = default)
    {
        var settings = await db.SystemSettings.AsNoTracking()
            .Where(x => PaymentSettingKeys.Contains(x.Key))
            .ToDictionaryAsync(x => x.Key, x => x.Value, cancellationToken);

        return new MarketplacePaymentSettings(
            settings.GetValueOrDefault(MarketplacePolicy.PaymentBankBinSettingKey) ?? string.Empty,
            settings.GetValueOrDefault(MarketplacePolicy.PaymentBankNameSettingKey) ?? string.Empty,
            settings.GetValueOrDefault(MarketplacePolicy.PaymentAccountNumberSettingKey) ?? string.Empty,
            settings.GetValueOrDefault(MarketplacePolicy.PaymentAccountNameSettingKey) ?? string.Empty,
            settings.GetValueOrDefault(MarketplacePolicy.PaymentSupportEmailSettingKey) ?? string.Empty);
    }

    public async Task<MarketplacePaymentSettings> UpdateAsync(
        decimal displayFee,
        MarketplacePaymentSettings payment,
        Guid actorId,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var values = new Dictionary<string, string>
        {
            [MarketplacePolicy.DisplayFeeSettingKey] = displayFee.ToString(CultureInfo.InvariantCulture),
            [MarketplacePolicy.PaymentBankBinSettingKey] = payment.BankBin.Trim(),
            [MarketplacePolicy.PaymentBankNameSettingKey] = payment.BankName.Trim(),
            [MarketplacePolicy.PaymentAccountNumberSettingKey] = payment.AccountNumber.Trim(),
            [MarketplacePolicy.PaymentAccountNameSettingKey] = payment.AccountName.Trim().ToUpperInvariant(),
            [MarketplacePolicy.PaymentSupportEmailSettingKey] = payment.SupportEmail.Trim().ToLowerInvariant()
        };
        var keys = values.Keys.ToArray();
        var existing = await db.SystemSettings
            .Where(x => keys.Contains(x.Key))
            .ToDictionaryAsync(x => x.Key, cancellationToken);

        foreach (var (key, value) in values)
        {
            if (existing.TryGetValue(key, out var setting))
            {
                setting.Value = value;
                setting.UpdatedAt = now;
                setting.UpdatedByUserId = actorId;
            }
            else
            {
                db.SystemSettings.Add(new SystemSetting
                {
                    Key = key,
                    Value = value,
                    UpdatedAt = now,
                    UpdatedByUserId = actorId
                });
            }
        }

        await db.SaveChangesAsync(cancellationToken);
        return payment with { AccountName = payment.AccountName.Trim().ToUpperInvariant() };
    }
}

public sealed record MarketplacePaymentSettings(
    string BankBin,
    string BankName,
    string AccountNumber,
    string AccountName,
    string SupportEmail)
{
    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(BankBin) &&
        !string.IsNullOrWhiteSpace(BankName) &&
        !string.IsNullOrWhiteSpace(AccountNumber) &&
        !string.IsNullOrWhiteSpace(AccountName) &&
        !string.IsNullOrWhiteSpace(SupportEmail);
}
