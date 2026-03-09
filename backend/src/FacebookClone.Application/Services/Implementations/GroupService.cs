using AutoMapper;
using FacebookClone.Application.DTOs.Group;
using FacebookClone.Application.DTOs.User;
using FacebookClone.Application.Services.Interfaces;
using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Enums;
using FacebookClone.Domain.Interfaces;

namespace FacebookClone.Application.Services.Implementations;

public class GroupService : IGroupService
{
    private readonly IGroupRepository _groupRepo;
    private readonly IMapper _mapper;

    public GroupService(IGroupRepository groupRepo, IMapper mapper)
    {
        _groupRepo = groupRepo;
        _mapper = mapper;
    }

    public async Task<GroupResponseDto> CreateGroupAsync(Guid currentUserId, CreateGroupRequest request)
    {
        var group = new Group
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Description = request.Description,
            OwnerId = currentUserId,
            Privacy = request.Privacy,
            CreatedAt = DateTime.UtcNow
        };

        // Người tạo nhóm tự động trở thành Admin và là Member đầu tiên
        var adminMember = new GroupMember
        {
            GroupId = group.Id,
            UserId = currentUserId,
            Role = GroupRole.Admin,
            JoinedAt = DateTime.UtcNow
        };
        group.Members.Add(adminMember);

        await _groupRepo.AddGroupAsync(group);

        var createdGroup = await _groupRepo.GetByIdAsync(group.Id);

        return MapToDto(createdGroup!, currentUserId);
    }

    public async Task<IEnumerable<GroupResponseDto>> GetAllGroupsAsync(Guid currentUserId, int pageNumber, int pageSize)
    {
        var groups = await _groupRepo.GetAllGroupsAsync(pageNumber, pageSize);
        return groups.Select(g => MapToDto(g, currentUserId));
    }

    public async Task<GroupResponseDto> GetGroupDetailsAsync(Guid currentUserId, Guid groupId)
    {
        var group = await _groupRepo.GetByIdAsync(groupId);
        if (group == null) throw new Exception("Không tìm thấy nhóm.");
        return MapToDto(group, currentUserId);
    }

    public async Task<string> JoinGroupAsync(Guid currentUserId, Guid groupId)
    {
        var group = await _groupRepo.GetByIdAsync(groupId);
        if (group == null) throw new Exception("Không tìm thấy nhóm.");

        var existingMember = await _groupRepo.GetMemberAsync(groupId, currentUserId);
        if (existingMember != null) return "Bạn đã là thành viên của nhóm này.";

        var newMember = new GroupMember
        {
            GroupId = groupId,
            UserId = currentUserId,
            Role = GroupRole.Member,
            JoinedAt = DateTime.UtcNow
        };

        await _groupRepo.AddMemberAsync(newMember);
        return "Đã tham gia nhóm thành công.";
    }

    public async Task<string> LeaveGroupAsync(Guid currentUserId, Guid groupId)
    {
        var group = await _groupRepo.GetByIdAsync(groupId);
        if (group == null) throw new Exception("Không tìm thấy nhóm.");

        if (group.OwnerId == currentUserId) throw new Exception("Chủ nhóm không thể rời nhóm. Vui lòng nhượng quyền hoặc xóa nhóm.");

        var member = await _groupRepo.GetMemberAsync(groupId, currentUserId);
        if (member == null) throw new Exception("Bạn không phải là thành viên của nhóm này.");

        await _groupRepo.RemoveMemberAsync(member);
        return "Đã rời nhóm.";
    }

    // Helper method map tay cho lẹ
    private GroupResponseDto MapToDto(Group group, Guid currentUserId)
    {
        return new GroupResponseDto
        {
            Id = group.Id,
            Name = group.Name,
            Description = group.Description,
            Privacy = group.Privacy,
            CreatedAt = group.CreatedAt,
            MembersCount = group.Members.Count,
            IsJoinedByMe = group.Members.Any(m => m.UserId == currentUserId),
            Owner = _mapper.Map<UserProfileDto>(group.Owner)
        };
    }
}