using FacebookClone.Application.DTOs.Post;
using FacebookClone.Application.DTOs.Interaction;
using FacebookClone.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FacebookClone.API.Controllers;

[Route("api/v1/[controller]")]
[ApiController]
[Authorize] // Bắt buộc đăng nhập mới được dùng API này
public class PostsController : ControllerBase
{
    private readonly IPostService _postService;

    public PostsController(IPostService postService)
    {
        _postService = postService;
    }

    private Guid GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(idClaim!);
    }

    // 1. LẤY BẢNG TIN (GET /api/v1/posts)
    [HttpGet]
    public async Task<IActionResult> GetNewsFeed([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        var currentUserId = GetCurrentUserId(); // 👈 Lấy ID của user đang đăng nhập
        var posts = await _postService.GetNewsFeedAsync(currentUserId, pageNumber, pageSize);
        return Ok(new { success = true, data = posts });
    }

    // 2. ĐĂNG BÀI VIẾT (POST /api/v1/posts)
    [HttpPost]
    [DisableRequestSizeLimit] // 👈 Cho phép gửi video nặng
    [RequestFormLimits(ValueLengthLimit = int.MaxValue, MultipartBodyLengthLimit = int.MaxValue)]
    public async Task<IActionResult> CreatePost([FromForm] CreatePostRequest request) // 👈 Đổi [FromBody] thành [FromForm]
    {
        try {
            var post = await _postService.CreatePostAsync(GetCurrentUserId(), request);
            return Ok(new { success = true, data = post });
        } catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    // 3. SỬA BÀI VIẾT (PUT /api/v1/posts/{id})
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePost(Guid id, [FromBody] UpdatePostRequest request)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out Guid userId))
            return Unauthorized(new { success = false, message = "Token không hợp lệ" });

        try
        {
            var updatedPost = await _postService.UpdatePostAsync(id, userId, request);
            return Ok(new { success = true, data = updatedPost, message = "Đã cập nhật bài viết!" });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { success = false, message = ex.Message }); // 403 Forbidden
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message }); // 400 Bad Request
        }
    }

    // 4. XÓA BÀI VIẾT (DELETE /api/v1/posts/{id})
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePost(Guid id)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out Guid userId))
            return Unauthorized(new { success = false, message = "Token không hợp lệ" });

        try
        {
            await _postService.DeletePostAsync(id, userId);
            return Ok(new { success = true, message = "Bài viết đã được chuyển vào thùng rác." });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("{postId}/reactions")]
    public async Task<IActionResult> ToggleReaction(Guid postId, [FromBody] ReactionRequest request)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out Guid userId)) return Unauthorized();

        // ⚠️ Lưu ý: Bạn cần Inject IInteractionService vào Constructor của PostsController nhé!
        var interactionService = HttpContext.RequestServices.GetRequiredService<IInteractionService>();
        
        try {
            var message = await interactionService.ToggleReactionAsync(userId, postId, request);
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
            return Ok(new { success = true, data = newComment, message = "Đã bình luận." });
        } catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HttpGet("{postId}/comments")]
    public async Task<IActionResult> GetComments(Guid postId, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        var interactionService = HttpContext.RequestServices.GetRequiredService<IInteractionService>();
        var comments = await interactionService.GetCommentsAsync(postId, pageNumber, pageSize);
        return Ok(new { success = true, data = comments });
    }

    // 5. THẢ TIM BÌNH LUẬN (POST /api/v1/posts/comments/{commentId}/reactions)
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
    
}