namespace FacebookClone.Domain.Entities;

public class LocaleLanguage
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string NativeName { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = true;
    public bool IsDefault { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<LocalizationEntry> Entries { get; set; } = new List<LocalizationEntry>();
}
