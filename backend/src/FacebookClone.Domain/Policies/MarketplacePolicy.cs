namespace FacebookClone.Domain.Policies;

public static class MarketplacePolicy
{
    public const string CurrentTermsVersion = "2026-08-11";
    public const decimal DisplayFeeVnd = 10_000m;
    public const int MaxImageBytes = 10 * 1024 * 1024;
    public static readonly string[] Categories = ["Xe cộ", "Nhà đất", "Điện tử", "Đồ gia dụng", "Thời trang", "Giải trí", "Khác"];
}
