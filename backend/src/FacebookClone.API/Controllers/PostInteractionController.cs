using FacebookClone.API.Common;
using FacebookClone.Application.DTOs.Post;
using FacebookClone.Application.Services.Interfaces;
using FacebookClone.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FacebookClone.API.Controllers;

[ApiController]
[Route("api/v1/posts")]
[Authorize]
public class PostInteractionController : ControllerBase
{
    private readonly IPostInteractionService _interactionService;

    public PostInteractionController(IPostInteractionService interactionService)
    {
        _interactionService = interactionService;
    }

    private Guid CurrentUserId => UserContext.GetUserId(User);

    [HttpPost("{postId:guid}/interested")]
    public async Task<IActionResult> InterestPost(Guid postId)
    {
        var result = await _interactionService.AddInteractionAsync(
            CurrentUserId, postId, PostInteractionType.INTERESTED);
        return Ok(new { success = true, message = "Marked as interested", data = result });
    }

    [HttpPost("{postId:guid}/not-interested")]
    public async Task<IActionResult> NotInterestedPost(Guid postId)
    {
        await _interactionService.RemoveInteractionAsync(
            CurrentUserId, postId, PostInteractionType.INTERESTED);
        var result = await _interactionService.AddInteractionAsync(
            CurrentUserId, postId, PostInteractionType.NOT_INTERESTED);
        return Ok(new { success = true, message = "Marked as not interested", data = result });
    }

    [HttpPost("{postId:guid}/save")]
    public async Task<IActionResult> SavePost(Guid postId)
    {
        var result = await _interactionService.AddInteractionAsync(
            CurrentUserId, postId, PostInteractionType.SAVED);
        return Ok(new { success = true, message = "Post saved", data = result });
    }

    [HttpDelete("{postId:guid}/save")]
    public async Task<IActionResult> UnsavePost(Guid postId)
    {
        await _interactionService.RemoveInteractionAsync(
            CurrentUserId, postId, PostInteractionType.SAVED);
        return Ok(new { success = true, message = "Post unsaved" });
    }

    [HttpPost("{postId:guid}/report")]
    public async Task<IActionResult> ReportPost(Guid postId, [FromBody] PostInteractionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ReportReason))
            return BadRequest(new { success = false, message = "Vui long cung cap ly do bao cao" });
        var result = await _interactionService.ReportPostAsync(
            CurrentUserId, postId, request.ReportReason);
        return Ok(new { success = true, message = "Bao cao da duoc gui", data = result });
    }

    [HttpGet("saved")]
    public async Task<IActionResult> GetSavedPosts(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20)
    {
        var (items, total) = await _interactionService.GetUserSavedPostsAsync(
            CurrentUserId, pageNumber, pageSize);
        return Ok(new
        {
            success = true,
            message = "Danh sach bai viet da luu",
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
}
