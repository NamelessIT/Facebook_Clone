using System.ComponentModel.DataAnnotations;

namespace FacebookClone.Application.DTOs.Collection;

public class AddPostToCollectionRequest
{
    [Required]
    public Guid PostId { get; set; }
}
