using FacebookClone.API.Common;
using FacebookClone.Application.DTOs.Collection;
using FacebookClone.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FacebookClone.API.Controllers;

[ApiController]
[Route("api/v1/collections")]
[Authorize]
public class SavedCollectionController : ControllerBase
{
    private readonly ISavedCollectionService _service;

    public SavedCollectionController(ISavedCollectionService service)
    {
        _service = service;
    }

    private Guid CurrentUserId => UserContext.GetUserId(User);

    [HttpGet]
    public async Task<IActionResult> GetCollections()
    {
        var collections = await _service.GetUserCollectionsAsync(CurrentUserId);
        return Ok(new { success = true, message = "Danh sach bo suu tap", data = collections });
    }

    [HttpPost]
    public async Task<IActionResult> CreateCollection([FromBody] CreateCollectionRequest request)
    {
        try
        {
            var result = await _service.CreateCollectionAsync(CurrentUserId, request.Name);
            return Ok(new { success = true, message = "Da tao bo suu tap", data = result });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpDelete("{collectionId:guid}")]
    public async Task<IActionResult> DeleteCollection(Guid collectionId)
    {
        try
        {
            await _service.DeleteCollectionAsync(CurrentUserId, collectionId);
            return Ok(new { success = true, message = "Da xoa bo suu tap" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("{collectionId:guid}/posts")]
    public async Task<IActionResult> AddPostToCollection(Guid collectionId, [FromBody] AddPostToCollectionRequest request)
    {
        try
        {
            await _service.AddPostToCollectionAsync(CurrentUserId, collectionId, request.PostId);
            return Ok(new { success = true, message = "Da them bai viet vao bo suu tap" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpDelete("{collectionId:guid}/posts/{postId:guid}")]
    public async Task<IActionResult> RemovePostFromCollection(Guid collectionId, Guid postId)
    {
        try
        {
            await _service.RemovePostFromCollectionAsync(CurrentUserId, collectionId, postId);
            return Ok(new { success = true, message = "Da xoa bai viet khoi bo suu tap" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("{collectionId:guid}/posts")]
    public async Task<IActionResult> GetCollectionPosts(
        Guid collectionId,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20)
    {
        try
        {
            var (items, total) = await _service.GetCollectionPostsAsync(
                CurrentUserId, collectionId, pageNumber, pageSize);
            return Ok(new
            {
                success = true,
                message = "Danh sach bai viet trong bo suu tap",
                data = items,
                pagination = new
                {
                    page = pageNumber,
                    limit = pageSize,
                    total,
                    totalPages = (int)Math.Ceiling((double)total / pageSize)
                }
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
