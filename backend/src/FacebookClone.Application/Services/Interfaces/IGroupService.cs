using FacebookClone.Application.DTOs.Group;

namespace FacebookClone.Application.Services.Interfaces;

public interface IGroupService
{
    Task<GroupResponseDto> CreateGroupAsync(Guid currentUserId, CreateGroupRequest request);
    Task<IEnumerable<GroupResponseDto>> GetAllGroupsAsync(Guid currentUserId, int pageNumber, int pageSize);
    Task<GroupResponseDto> GetGroupDetailsAsync(Guid currentUserId, Guid groupId);
    Task<string> JoinGroupAsync(Guid currentUserId, Guid groupId);
    Task<string> LeaveGroupAsync(Guid currentUserId, Guid groupId);
}