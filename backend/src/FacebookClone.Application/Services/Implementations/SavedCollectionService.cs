using AutoMapper;
using FacebookClone.Application.DTOs.Collection;
using FacebookClone.Application.DTOs.Post;
using FacebookClone.Application.Services.Interfaces;
using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace FacebookClone.Application.Services.Implementations;

public class SavedCollectionService : ISavedCollectionService
{
    private readonly ISavedCollectionRepository _repo;
    private readonly ILogger<SavedCollectionService> _logger;
    private readonly IMapper _mapper;

    public SavedCollectionService(ISavedCollectionRepository repo, ILogger<SavedCollectionService> logger, IMapper mapper)
    {
        _repo = repo;
        _logger = logger;
        _mapper = mapper;
    }

    public async Task<IEnumerable<SavedCollectionDto>> GetUserCollectionsAsync(Guid userId)
    {
        var collections = await _repo.GetByUserAsync(userId);
        return collections.Select(c => new SavedCollectionDto
        {
            Id = c.Id,
            Name = c.Name,
            PostCount = c.Posts.Count,
            CreatedAt = c.CreatedAt
        });
    }

    public async Task<SavedCollectionDto> CreateCollectionAsync(Guid userId, string name)
    {
        var exists = await _repo.ExistsAsync(userId, name);
        if (exists)
            throw new InvalidOperationException("Bộ sưu tập với tên này đã tồn tại");

        var collection = new SavedCollection
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = name,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _repo.AddAsync(collection);
        _logger.LogInformation("SavedCollection created: userId={UserId}, name={Name}", userId, name);

        return new SavedCollectionDto
        {
            Id = collection.Id,
            Name = collection.Name,
            PostCount = 0,
            CreatedAt = collection.CreatedAt
        };
    }

    public async Task DeleteCollectionAsync(Guid userId, Guid collectionId)
    {
        var collection = await _repo.GetByIdAsync(collectionId);
        if (collection == null || collection.UserId != userId)
            throw new InvalidOperationException("Không tìm thấy bộ sưu tập");

        await _repo.RemoveAsync(collection);
        _logger.LogInformation("SavedCollection deleted: userId={UserId}, collectionId={CollectionId}", userId, collectionId);
    }

    public async Task AddPostToCollectionAsync(Guid userId, Guid collectionId, Guid postId)
    {
        var collection = await _repo.GetByIdAsync(collectionId);
        if (collection == null || collection.UserId != userId)
            throw new InvalidOperationException("Không tìm thấy bộ sưu tập");

        var exists = await _repo.PostExistsInCollectionAsync(collectionId, postId);
        if (exists) return;

        var item = new SavedCollectionPost
        {
            CollectionId = collectionId,
            PostId = postId,
            CreatedAt = DateTime.UtcNow
        };

        await _repo.AddPostAsync(item);
        _logger.LogInformation("Post added to collection: collectionId={CollectionId}, postId={PostId}", collectionId, postId);
    }

    public async Task RemovePostFromCollectionAsync(Guid userId, Guid collectionId, Guid postId)
    {
        var collection = await _repo.GetByIdAsync(collectionId);
        if (collection == null || collection.UserId != userId)
            throw new InvalidOperationException("Không tìm thấy bộ sưu tập");

        await _repo.RemovePostAsync(collectionId, postId);
        _logger.LogInformation("Post removed from collection: collectionId={CollectionId}, postId={PostId}", collectionId, postId);
    }

    public async Task<IReadOnlyList<Guid>> GetCollectionIdsContainingPostAsync(Guid userId, Guid postId)
    {
        return await _repo.GetCollectionIdsContainingPostAsync(userId, postId);
    }

    public async Task<(IEnumerable<object> Items, int Total)> GetCollectionPostsAsync(
        Guid userId, Guid collectionId, int page, int pageSize)
    {
        var collection = await _repo.GetByIdAsync(collectionId);
        if (collection == null || collection.UserId != userId)
            throw new InvalidOperationException("Không tìm thấy bộ sưu tập");

        var (items, total) = await _repo.GetPostsAsync(collectionId, page, pageSize);
        var result = items.Select(x =>
        {
            var post = _mapper.Map<PostResponseDto>(x.Post);
            post.IsSaved = true;
            return (object)new { Post = post, AddedAt = x.CreatedAt };
        });
        return (result, total);
    }
}
