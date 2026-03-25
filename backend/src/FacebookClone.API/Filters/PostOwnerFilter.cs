using FacebookClone.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Security.Claims;

namespace FacebookClone.API.Filters;

/// <summary>
/// Action filter kiểm tra user hiện tại có phải chủ bài post không.
/// Dùng trên action cần bảo vệ: [ServiceFilter(typeof(PostOwnerFilter))]
/// Route phải có tham số {id} là PostId.
/// </summary>
public class PostOwnerFilter : IAsyncActionFilter
{
    private readonly IPostRepository _postRepository;

    public PostOwnerFilter(IPostRepository postRepository)
    {
        _postRepository = postRepository;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var userIdClaim = context.HttpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdClaim, out var currentUserId))
        {
            context.Result = new UnauthorizedObjectResult(new { success = false, message = "Token không hợp lệ." });
            return;
        }

        if (!context.ActionArguments.TryGetValue("id", out var idObj) || idObj is not Guid postId)
        {
            context.Result = new BadRequestObjectResult(new { success = false, message = "PostId không hợp lệ." });
            return;
        }

        var post = await _postRepository.GetByIdAsync(postId);
        if (post == null)
        {
            context.Result = new NotFoundObjectResult(new { success = false, message = "Bài viết không tồn tại." });
            return;
        }

        if (post.UserId != currentUserId)
        {
            context.Result = new ObjectResult(new { success = false, message = "Bạn không có quyền thực hiện thao tác này." })
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
            return;
        }

        await next();
    }
}
