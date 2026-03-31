using FacebookClone.API.Filters;
using FacebookClone.Application.DTOs.Post;
using FacebookClone.Application.DTOs.Interaction;
using FacebookClone.Application.Services.Interfaces;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FacebookClone.API.Controllers;

[Route("api/v1/[controller]")]
[ApiController]
[Authorize]
public class PostsController : ControllerBase
{
    private readonly IPostService _postService;
    private readonly INotificationService _notificationService;

    public PostsController(IPostService postService, INotificationService notificationService)
    {
        _postService = postService;
        _notificationService = notificationService;
    }

    private Guid GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(idClaim!);
    }

    // 1. LAY BANG TIN
    [HttpGet]
    public async Task<IActionResult> GetNewsFeed([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        var currentUserId = GetCurrentUserId();
        var posts = await _postService.GetNewsFeedAsync(currentUserId, pageNumber, pageSize);
        return Ok(new { success = true, data = posts });
    }

    // 1b. LAY DANH SACH BAI VIET THEO USER
    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserPosts(Guid userId,
        [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var currentUserId = GetCurrentUserId();
        var (posts, total) = await _postService.GetUserPostsAsync(currentUserId, userId, pageNumber, pageSize);

        return Ok(new
        {
            success = true,
            message = "Lay danh sach bai viet thanh cong.",
            data = posts,
            pagination = new
            {
                page = pageNumber,
                limit = pageSize,
                total,
                totalPages = (int)Math.Ceiling((double)total / pageSize)
            }
        });
    }

    // 2. DANG BAI VIET
    [HttpPost]
    [DisableRequestSizeLimit]
    [RequestFormLimits(ValueLengthLimit = int.MaxValue, MultipartBodyLengthLimit = int.MaxValue)]
    public async Task<IActionResult> CreatePost([FromForm] CreatePostRequest request)
    {
        try {
            var post = await _postService.CreatePostAsync(GetCurrentUserId(), request);
            return Ok(new { success = true, data = post });
        } catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    // 3. SUA BAI VIET
    [HttpPut("{id}")]
    [ServiceFilter(typeof(PostOwnerFilter))]
    [DisableRequestSizeLimit]
    [RequestFormLimits(ValueLengthLimit = int.MaxValue, MultipartBodyLengthLimit = int.MaxValue)]
    public async Task<IActionResult> UpdatePost(Guid id, [FromForm] UpdatePostRequest request)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out Guid userId))
            return Unauthorized(new { success = false, message = "Token khong hop le" });

        try
        {
            var updatedPost = await _postService.UpdatePostAsync(id, userId, request);
            return Ok(new { success = true, data = updatedPost, message = "Da cap nhat bai viet!" });
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { success = false, message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    // 4. XOA BAI VIET
    [HttpDelete("{id}")]
    [ServiceFilter(typeof(PostOwnerFilter))]
    public async Task<IActionResult> DeletePost(Guid id)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out Guid userId))
            return Unauthorized(new { success = false, message = "Token khong hop le" });

        try
        {
            await _postService.DeletePostAsync(id, userId);
            return Ok(new { success = true, message = "Bai viet da duoc chuyen vao thung rac." });
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { success = false, message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    // 5. CHIA SE BAI VIET
    [HttpPost("{id}/share")]
    public async Task<IActionResult> SharePost(Guid id, [FromBody] SharePostRequest request)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out Guid userId))
            return Unauthorized(new { success = false, message = "Token khong hop le" });

        try
        {
            var sharedPost = await _postService.SharePostAsync(userId, id, request);
            return Ok(new { success = true, data = sharedPost, message = "Da chia se bai viet." });
        }
        catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    // 6. TOGGLE REACTION (Like/Unlike) - co trigger notification
    [HttpPost("{postId}/reactions")]
    public async Task<IActionResult> ToggleReaction(Guid postId, [FromBody] ReactionRequest request)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out Guid userId)) return Unauthorized();

        var interactionService = HttpContext.RequestServices.GetRequiredService<IInteractionService>();
        try {
            var message = await interactionService.ToggleReactionAsync(userId, postId, request);

            // Trigger notification cho post owner (fire-and-forget, khong block response)
            _ = TriggerReactionNotificationAsync(userId, postId);

            return Ok(new { success = true, message = message });
        } catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HttpPost("{postId}/comments")]
    public async Task<IActionResult> AddComment(Guid postId, [FromBody] CreateCommentRequest request)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out Guid userId)) return Unauthorized();

        var interactionService = HttpContext.RequestServices.GetRequiredService<IInteractionService>();
        try {
            var newComment = await interactionService.AddCommentAsync(userId, postId, request);

            // Trigger notification cho post owner
            _ = TriggerCommentNotificationAsync(userId, postId);

            return Ok(new { success = true, data = newComment, message = "Da binh luan." });
        } catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HttpGet("{postId}/comments")]
    public async Task<IActionResult> GetComments(Guid postId, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        var interactionService = HttpContext.RequestServices.GetRequiredService<IInteractionService>();
        var comments = await interactionService.GetCommentsAsync(postId, pageNumber, pageSize);
        return Ok(new { success = true, data = comments });
    }

    [HttpPost("comments/{commentId}/reactions")]
    public async Task<IActionResult> ToggleCommentReaction(Guid commentId, [FromBody] ReactionRequest request)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out Guid userId)) return Unauthorized();

        var interactionService = HttpContext.RequestServices.GetRequiredService<IInteractionService>();
        try {
            var message = await interactionService.ToggleCommentReactionAsync(userId, commentId, request);
            return Ok(new { success = true, message = message });
        } catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    // Fire-and-forget: lay post owner roi gui notification (khong block response chinh)
    private async Task TriggerReactionNotificationAsync(Guid actorId, Guid postId)
    {
        try
        {
            var postRepo = HttpContext.RequestServices.GetRequiredService<IPostRepository>();
            var post = await postRepo.GetByIdAsync(postId);
            if (post == null || post.UserId == actorId) return;

            await _notificationService.CreateNotificationAsync(
                post.UserId, actorId, NotificationType.Like, postId,
                "da thich bai viet cua ban");
        }
        catch { /* Notification failure khong duoc break action chinh */ }
    }

    private async Task TriggerCommentNotificationAsync(Guid actorId, Guid postId)
    {
        try
        {
            var postRepo = HttpContext.RequestServices.GetRequiredService<IPostRepository>();
            var post = await postRepo.GetByIdAsync(postId);
            if (post == null || post.UserId == actorId) return;

            await _notificationService.CreateNotificationAsync(
                post.UserId, actorId, NotificationType.Comment, postId,
                "da binh luan bai viet cua ban");
        }
        catch { /* Notification failure khong duoc break action chinh */ }
    }
}
