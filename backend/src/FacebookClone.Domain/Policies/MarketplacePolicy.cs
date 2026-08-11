namespace FacebookClone.Domain.Policies;

public static class MarketplacePolicy
{
    public const string CurrentTermsVersion = "2026-08-11";
    public const string DisplayFeeSettingKey = "marketplace.display_fee_vnd";
    public const decimal DefaultDisplayFeeVnd = 10_000m;
    public const decimal MinDisplayFeeVnd = 0m;
    public const decimal MaxDisplayFeeVnd = 1_000_000_000m;
    public const int MaxImageBytes = 10 * 1024 * 1024;
    public static readonly string[] Categories = ["Xe cộ", "Nhà đất", "Điện tử", "Đồ gia dụng", "Thời trang", "Giải trí", "Khác"];
}
