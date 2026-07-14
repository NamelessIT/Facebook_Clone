using FacebookClone.Application.Services.Interfaces;
using FacebookClone.API.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace FacebookClone.API.Controllers;

[Route("api/v1/search")]
[ApiController]
[Authorize]
[EnableRateLimiting(RateLimitingExtensions.SearchPolicy)]
public class SearchController : ControllerBase
{
    private readonly ISearchService _searchService;

    public SearchController(ISearchService searchService)
    {
        _searchService = searchService;
    }

    // GET /api/v1/search/users?q=&pageNumber=1&pageSize=10
    [HttpGet("users")]
    public async Task<IActionResult> SearchUsers(
        [FromQuery] string q = "",
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        pageSize = Math.Clamp(pageSize, 1, 50);
        q = q ?? "";
        
        var (items, total) = await _searchService.SearchUsersAsync(q, pageNumber, pageSize);
        var totalPages = (int)Math.Ceiling(total / (double)pageSize);

        return Ok(new
        {
            success = true,
            data = items,
            pagination = new { page = pageNumber, limit = pageSize, total, totalPages }
        });
    }

    // GET /api/v1/search/posts?q=&pageNumber=1&pageSize=10
    [HttpGet("posts")]
    public async Task<IActionResult> SearchPosts(
        [FromQuery] string q,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        if (string.IsNullOrWhiteSpace(q))
            return BadRequest(new { success = false, message = "Vui lòng nhập từ khóa tìm kiếm." });

        pageSize = Math.Clamp(pageSize, 1, 50);
        var (items, total) = await _searchService.SearchPostsAsync(q, pageNumber, pageSize);
        var totalPages = (int)Math.Ceiling(total / (double)pageSize);

        return Ok(new
        {
            success = true,
            data = items,
            pagination = new { page = pageNumber, limit = pageSize, total, totalPages }
        });
    }
}
