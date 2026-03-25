using FacebookClone.Application.DTOs.Friendship;
using FacebookClone.Application.Services.Interfaces;
using FacebookClone.Domain.Enums;
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
    private readonly INotificationService _notificationService;

    public FriendshipsController(IFriendshipService friendshipService, INotificationService notificationService)
    {
        _friendshipService = friendshipService;
        _notificationService = notificationService;
    }

    private Guid GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(idClaim!);
    }

    // Gui loi moi ket ban - FriendshipService da tu trigger FriendRequest notification
    [HttpPost("request/{receiverId}")]
    public async Task<IActionResult> SendRequest(Guid receiverId)
    {
        try {
            var message = await _friendshipService.SendFriendRequestAsync(GetCurrentUserId(), receiverId);
            return Ok(new { success = true, message });
        } catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    // Chap nhan / tu choi loi moi - neu chap nhan thi trigger FriendAccepted notification
    [HttpPost("respond/{requesterId}")]
    public async Task<IActionResult> RespondToRequest(Guid requesterId, [FromQuery] bool accept)
    {
        try {
            var currentUserId = GetCurrentUserId();
            var message = await _friendshipService.RespondToRequestAsync(currentUserId, requesterId, accept);

            // Chi trigger FriendAccepted notification khi chap nhan
            if (accept)
            {
                _ = TriggerFriendAcceptedNotificationAsync(requesterId, currentUserId);
            }

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

    // Fire-and-forget: gui FriendAccepted notification cho nguoi da gui loi moi
    private async Task TriggerFriendAcceptedNotificationAsync(Guid requesterId, Guid acceptorId)
    {
        try
        {
            await _notificationService.CreateNotificationAsync(
                requesterId, acceptorId, NotificationType.FriendAccepted, acceptorId,
                "da chap nhan loi moi ket ban cua ban");
        }
        catch { /* Notification failure khong duoc break action chinh */ }
    }
}
