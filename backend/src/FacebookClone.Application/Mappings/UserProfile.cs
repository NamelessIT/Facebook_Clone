using AutoMapper;
using FacebookClone.Domain.Entities;
using FacebookClone.Application.DTOs.User;

namespace FacebookClone.Application.Mappings;

public class UserProfile : Profile
{
    public UserProfile()
    {
        CreateMap<User, UserProfileDto>();
        // Nếu tên field giống nhau, AutoMapper tự map.
        // Nếu khác nhau, phải config tay. Ví dụ:
        // .ForMember(dest => dest.FullName, opt => opt.MapFrom(src => src.FirstName + " " + src.LastName));
    }
}