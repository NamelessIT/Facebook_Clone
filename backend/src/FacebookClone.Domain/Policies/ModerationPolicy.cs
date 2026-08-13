namespace FacebookClone.Domain.Policies;

public static class ModerationPolicy
{
    public const int ReviewSlaHours = 24;
    public const int DefaultSuspensionHours = 72;
    public const int MaximumSuspensionHours = 8_760;
    public static readonly int[] SuggestedSuspensionHours = [24, 72, 168, 720];

    public static DateTime ReviewDueAt(DateTime createdAt) => createdAt.AddHours(ReviewSlaHours);
    public static DateTime? PunishmentEndsAt(DateTime startedAt, int? durationHours) =>
        durationHours.HasValue ? startedAt.AddHours(durationHours.Value) : null;
}
