using AutoMapper;
using FacebookClone.Application.DTOs.Post;
using FacebookClone.Application.Services.Interfaces;
using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace FacebookClone.Application.Services.Implementations;

public class PostInteractionService : IPostInteractionService
{
    private readonly IPostInteractionRepository _repo;
    private readonly ILogger<PostInteractionService> _logger;
    private readonly IMapper _mapper;

    public PostInteractionService(IPostInteractionRepository repo, ILogger<PostInteractionService> logger, IMapper mapper)
    {
        _repo = repo;
        _logger = logger;
        _mapper = mapper;
    }

    public async Task<PostInteractionResponse> AddInteractionAsync(Guid userId, Guid postId, string type)
    {
        var existing = await _repo.GetAsync(userId, postId, type);
        if (existing != null)
            return MapToResponse(existing);

        var interaction = new PostInteraction
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            PostId = postId,
            InteractionType = type,
            CreatedAt = DateTime.UtcNow
        };

        await _repo.AddAsync(interaction);
        _logger.LogInformation("PostInteraction added: userId={UserId}, postId={PostId}, type={Type}", userId, postId, type);
        return MapToResponse(interaction);
    }

    public async Task RemoveInteractionAsync(Guid userId, Guid postId, string type)
    {
        var interaction = await _repo.GetAsync(userId, postId, type);
        if (interaction == null) return;

        await _repo.RemoveAsync(interaction);
        _logger.LogInformation("PostInteraction removed: userId={UserId}, postId={PostId}, type={Type}", userId, postId, type);
    }

    public async Task<PostInteractionResponse> ReportPostAsync(Guid userId, Guid postId, string reason)
    {
        var existing = await _repo.GetAsync(userId, postId, PostInteractionType.REPORTED);
        if (existing != null)
            return MapToResponse(existing);

        var interaction = new PostInteraction
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            PostId = postId,
            InteractionType = PostInteractionType.REPORTED,
            ReportReason = reason,
            CreatedAt = DateTime.UtcNow
        };

        await _repo.AddAsync(interaction);
        _logger.LogWarning("Post reported: userId={UserId}, postId={PostId}, reason={Reason}", userId, postId, reason);
        return MapToResponse(interaction);
    }

    public async Task<bool> IsPostSavedAsync(Guid userId, Guid postId)
    {
        return await _repo.ExistsAsync(userId, postId, PostInteractionType.SAVED);
    }

    public async Task<(IEnumerable<object> Items, int Total)> GetUserSavedPostsAsync(Guid userId, int page, int pageSize)
    {
        var (interactions, total) = await _repo.GetSavedByUserAsync(userId, page, pageSize);
        var items = interactions.Select(x =>
        {
            var post = _mapper.Map<PostResponseDto>(x.Post);
            post.IsSaved = true;
            return (object)new { Post = post, SavedAt = x.CreatedAt };
        });
        return (items, total);
    }

    private static PostInteractionResponse MapToResponse(PostInteraction i) =>
        new()
        {
            Id = i.Id,
            PostId = i.PostId,
            UserId = i.UserId,
            InteractionType = i.InteractionType,
            CreatedAt = i.CreatedAt
        };
}

