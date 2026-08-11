using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Policies;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.Infrastructure.Seed;

public class MarketplaceSeeder : ISeeder
{
    private static readonly (string Title, decimal Price, string Category, string Location, string Condition)[] Catalog =
    [
        ("MacBook Air M2 13 inch", 18_700_000, "Điện tử", "Quận 1, TP.HCM", "Đã qua sử dụng - như mới"),
        ("Honda Vision 2024", 32_900_000, "Xe cộ", "Thủ Đức, TP.HCM", "Đã qua sử dụng - tốt"),
        ("Căn hộ studio đầy đủ nội thất", 6_500_000, "Nhà đất", "Bình Thạnh, TP.HCM", "Cho thuê theo tháng"),
        ("Máy ảnh Fujifilm X-S10", 15_400_000, "Điện tử", "Hải Châu, Đà Nẵng", "Đã qua sử dụng - như mới"),
        ("Bàn làm việc gỗ tối giản", 1_250_000, "Đồ gia dụng", "Cầu Giấy, Hà Nội", "Mới"),
        ("Áo khoác denim unisex", 420_000, "Thời trang", "Quận 3, TP.HCM", "Mới"),
        ("Nintendo Switch OLED", 6_850_000, "Giải trí", "Ninh Kiều, Cần Thơ", "Đã qua sử dụng - tốt"),
        ("Ghế công thái học", 2_850_000, "Đồ gia dụng", "Quận 7, TP.HCM", "Mới"),
        ("iPhone 15 Pro 256GB", 22_900_000, "Điện tử", "Hoàn Kiếm, Hà Nội", "Đã qua sử dụng - như mới"),
        ("Xe đạp địa hình Giant", 4_900_000, "Xe cộ", "Biên Hòa, Đồng Nai", "Đã qua sử dụng - tốt"),
        ("Bộ loa bookshelf Edifier", 3_100_000, "Giải trí", "Quận 10, TP.HCM", "Đã qua sử dụng - như mới"),
        ("Túi đeo chéo da thủ công", 780_000, "Thời trang", "Hội An, Quảng Nam", "Mới")
    ];

    public async Task SeedAsync(AppDbContext context)
    {
        if (await context.MarketplaceListings.AnyAsync()) return;
        var sellers = await context.Users.Where(x => !x.IsAdmin && !x.IsDeleted).OrderBy(x => x.CreatedAt).Take(12).ToListAsync();
        if (sellers.Count == 0) return;
        var now = DateTime.UtcNow;
        for (var index = 0; index < Catalog.Length; index++)
        {
            var item = Catalog[index];
            context.MarketplaceListings.Add(new MarketplaceListing
            {
                Id = Guid.NewGuid(), SellerId = sellers[index % sellers.Count].Id, Title = item.Title,
                Description = $"{item.Title} được mô tả đúng tình trạng. Vui lòng liên hệ người bán để xác minh và xem thêm hình ảnh trước khi giao dịch.",
                Price = item.Price, Category = item.Category, Location = item.Location, Condition = item.Condition,
                ImageUrl = $"https://picsum.photos/seed/fb-market-{index + 1:00}/900/680", Status = MarketplaceListingStatus.Approved,
                DisplayFee = MarketplacePolicy.DisplayFeeVnd, TermsVersion = MarketplacePolicy.CurrentTermsVersion,
                TermsAcceptedAt = now.AddDays(-index - 1), CreatedAt = now.AddHours(-index - 1), UpdatedAt = now.AddHours(-index - 1),
                ReviewedAt = now.AddHours(-index), ModerationNote = "Dữ liệu mẫu đã được duyệt."
            });
        }
    }
}
