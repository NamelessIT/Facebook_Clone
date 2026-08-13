namespace FacebookClone.Domain.Policies;

public static class MarketplacePolicy
{
    public const string CurrentTermsVersion = "2026-08-11";
    public const string DisplayFeeSettingKey = "marketplace.display_fee_vnd";
    public const string CategoryFeesSettingKey = "marketplace.category_fees_v1";
    public const string PaymentBankBinSettingKey = "marketplace.payment.bank_bin";
    public const string PaymentBankNameSettingKey = "marketplace.payment.bank_name";
    public const string PaymentAccountNumberSettingKey = "marketplace.payment.account_number";
    public const string PaymentAccountNameSettingKey = "marketplace.payment.account_name";
    public const string PaymentSupportEmailSettingKey = "marketplace.payment.support_email";
    public const decimal DefaultDisplayFeeVnd = 10_000m;
    public const decimal MinDisplayFeeVnd = 0m;
    public const decimal MaxDisplayFeeVnd = 1_000_000_000m;
    public const int MaxImageBytes = 10 * 1024 * 1024;
    public static readonly TimeSpan PaymentLifetime = TimeSpan.FromMinutes(30);
    public static readonly string[] Categories = ["Xe cộ", "Nhà đất", "Điện tử", "Đồ gia dụng", "Thời trang", "Giải trí", "Khác"];
}
