using AutoMapper;
using FacebookClone.Application.DTOs.Post;
using FacebookClone.Application.DTOs.Interaction;
using FacebookClone.Domain.Entities;

namespace FacebookClone.Application.Mappings;

public class PostProfile : Profile
{
    public PostProfile()
    {
        // Chuyển từ Post sang PostResponseDto
        CreateMap<Post, PostResponseDto>()
            .ForMember(dest => dest.Author, opt => opt.MapFrom(src => src.User))
            .ForMember(dest => dest.ReactionsCount, opt => opt.MapFrom(src => src.Reactions.Count))
            .ForMember(dest => dest.CommentsCount, opt => opt.MapFrom(src => src.Comments.Count));

        CreateMap<Comment, CommentResponseDto>()
            .ForMember(dest => dest.Author, opt => opt.MapFrom(src => src.User));
    }
}