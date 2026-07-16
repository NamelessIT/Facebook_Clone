namespace FacebookClone.API.Services;

public record InternalTranslationRequest(
    string SourceLocale,
    string TargetLocale,
    string Text);

public record InternalTranslationResult(
    bool Success,
    string? Text,
    IReadOnlyList<string> Chunks,
    IReadOnlyList<string> Errors);

public interface IInternalTranslationService
{
    Task<InternalTranslationResult> TranslateAsync(
        InternalTranslationRequest request,
        CancellationToken cancellationToken = default);
}
