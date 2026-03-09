using FacebookClone.Domain.Entities;

namespace FacebookClone.Domain.Interfaces;

public interface IGroupRepository
{
    Task AddGroupAsync(Group group);
    Task<Group?> GetByIdAsync(Guid id);
    Task<IEnumerable<Group>> GetAllGroupsAsync(int pageNumber, int pageSize);
    
    // Quản lý thành viên
    Task<GroupMember?> GetMemberAsync(Guid groupId, Guid userId);
    Task AddMemberAsync(GroupMember member);
    Task RemoveMemberAsync(GroupMember member);
}