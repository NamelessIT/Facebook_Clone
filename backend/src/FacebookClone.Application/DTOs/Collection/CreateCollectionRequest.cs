using System.ComponentModel.DataAnnotations;

namespace FacebookClone.Application.DTOs.Collection;

public class CreateCollectionRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = null!;
}
