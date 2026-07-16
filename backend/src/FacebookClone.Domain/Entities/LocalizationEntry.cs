namespace FacebookClone.Domain.Entities;

public class LocalizationEntry
{
    public Guid Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string SourceLocale { get; set; } = string.Empty;
    public string TargetLocale { get; set; } = string.Empty;
    public string SourceText { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Context { get; set; }
    public bool IsMachineTranslated { get; set; }
    public string? LastError { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public LocaleLanguage? TargetLanguage { get; set; }
}
