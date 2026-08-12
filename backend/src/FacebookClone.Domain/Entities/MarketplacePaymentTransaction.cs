using FacebookClone.Domain.Enums;

namespace FacebookClone.Domain.Entities;

public class MarketplacePaymentTransaction
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "VND";
    public string ReferenceCode { get; set; } = string.Empty;
    public MarketplacePaymentStatus Status { get; set; } = MarketplacePaymentStatus.Pending;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public Guid? VerifiedById { get; set; }
    public string? FailureReason { get; set; }
    public MarketplaceListing? Listing { get; set; }
}
