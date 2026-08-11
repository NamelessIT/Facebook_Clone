using FacebookClone.Domain.Enums;

namespace FacebookClone.Domain.Entities;

public class MarketplaceListing
{
    public Guid Id { get; set; }
    public Guid SellerId { get; set; }
    public User Seller { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Currency { get; set; } = "VND";
    public string Category { get; set; } = string.Empty;
    public string Condition { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public MarketplaceListingStatus Status { get; set; } = MarketplaceListingStatus.PendingReview;
    public decimal DisplayFee { get; set; }
    public string TermsVersion { get; set; } = string.Empty;
    public DateTime TermsAcceptedAt { get; set; }
    public int ViewCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public Guid? ReviewedById { get; set; }
    public string? ModerationNote { get; set; }
    public bool IsDeleted { get; set; }
    public ICollection<MarketplaceFavorite> Favorites { get; set; } = new List<MarketplaceFavorite>();
}
