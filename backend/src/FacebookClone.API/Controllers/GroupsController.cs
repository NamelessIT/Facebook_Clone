using FacebookClone.Application.DTOs.Group;
using FacebookClone.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FacebookClone.API.Controllers;

[Route("api/v1/[controller]")]
[ApiController]
[Authorize]
public class GroupsController : ControllerBase
{
    private readonly IGroupService _groupService;

    public GroupsController(IGroupService groupService)
    {
        _groupService = groupService;
    }

    private Guid GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(idClaim!);
    }

    [HttpPost]
    public async Task<IActionResult> CreateGroup([FromBody] CreateGroupRequest request)
    {
        try {
            var group = await _groupService.CreateGroupAsync(GetCurrentUserId(), request);
            return Ok(new { success = true, data = group });
        } catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HttpGet]
    public async Task<IActionResult> GetAllGroups([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        var groups = await _groupService.GetAllGroupsAsync(GetCurrentUserId(), pageNumber, pageSize);
        return Ok(new { success = true, data = groups });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetGroupDetails(Guid id)
    {
        try {
            var group = await _groupService.GetGroupDetailsAsync(GetCurrentUserId(), id);
            return Ok(new { success = true, data = group });
        } catch (Exception ex) { return NotFound(new { success = false, message = ex.Message }); }
    }

    [HttpPost("{id}/join")]
    public async Task<IActionResult> JoinGroup(Guid id)
    {
        try {
            var message = await _groupService.JoinGroupAsync(GetCurrentUserId(), id);
            return Ok(new { success = true, message });
        } catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HttpPost("{id}/leave")]
    public async Task<IActionResult> LeaveGroup(Guid id)
    {
        try {
            var message = await _groupService.LeaveGroupAsync(GetCurrentUserId(), id);
            return Ok(new { success = true, message });
        } catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }
}