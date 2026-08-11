namespace FacebookClone.Domain.Entities;

public class MarketplaceFavorite
{
    public Guid ListingId { get; set; }
    public MarketplaceListing Listing { get; set; } = null!;
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
}
