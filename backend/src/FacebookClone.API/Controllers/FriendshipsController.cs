using FacebookClone.Application.DTOs.Friendship;
using FacebookClone.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FacebookClone.API.Controllers;

[Route("api/v1/[controller]")]
[ApiController]
[Authorize]
public class FriendshipsController : ControllerBase
{
    private readonly IFriendshipService _friendshipService;

    public FriendshipsController(IFriendshipService friendshipService)
    {
        _friendshipService = friendshipService;
    }

    private Guid GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(idClaim!);
    }

    [HttpPost("request/{receiverId}")]
    public async Task<IActionResult> SendRequest(Guid receiverId)
    {
        try {
            var message = await _friendshipService.SendFriendRequestAsync(GetCurrentUserId(), receiverId);
            return Ok(new { success = true, message });
        } catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HttpPost("respond/{requesterId}")]
    public async Task<IActionResult> RespondToRequest(Guid requesterId, [FromQuery] bool accept)
    {
        try {
            var message = await _friendshipService.RespondToRequestAsync(GetCurrentUserId(), requesterId, accept);
            return Ok(new { success = true, message });
        } catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HttpDelete("unfriend/{friendId}")]
    public async Task<IActionResult> Unfriend(Guid friendId)
    {
        try {
            var message = await _friendshipService.UnfriendAsync(GetCurrentUserId(), friendId);
            return Ok(new { success = true, message });
        } catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HttpGet("friends")]
    public async Task<IActionResult> GetMyFriends()
    {
        var friends = await _friendshipService.GetFriendsAsync(GetCurrentUserId());
        return Ok(new { success = true, data = friends });
    }

    [HttpGet("requests/pending")]
    public async Task<IActionResult> GetPendingRequests()
    {
        var requests = await _friendshipService.GetPendingRequestsAsync(GetCurrentUserId());
        return Ok(new { success = true, data = requests });
    }
}