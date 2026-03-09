using FacebookClone.Domain.Enums;
using System.ComponentModel.DataAnnotations;

namespace FacebookClone.Application.DTOs.Group;

public class CreateGroupRequest
{
    [Required(ErrorMessage = "Tên nhóm không được để trống")]
    public string Name { get; set; } = null!;
    
    public string? Description { get; set; }
    
    public GroupPrivacy Privacy { get; set; } = GroupPrivacy.Public;
}