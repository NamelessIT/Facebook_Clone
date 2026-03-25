using AutoMapper;
using FacebookClone.Application.DTOs.Post;
using FacebookClone.Application.DTOs.Interaction;
using FacebookClone.Domain.Entities;

namespace FacebookClone.Application.Mappings;

public class PostProfile : Profile
{
    public PostProfile()
    {
        // 👇 1. Thêm cấu hình map cho Media (Rất quan trọng)
        CreateMap<MediaAttachment, MediaDto>();

        // 2. Chuyển từ Post sang PostResponseDto
        CreateMap<Post, PostResponseDto>()
            .ForMember(dest => dest.Author, opt => opt.MapFrom(src => src.User))
            .ForMember(dest => dest.ReactionsCount, opt => opt.MapFrom(src => src.Reactions.Count))
            .ForMember(dest => dest.CommentsCount, opt => opt.MapFrom(src => src.Comments.Count))
            // 👇 3. Bổ sung map danh sách Medias
            .ForMember(dest => dest.Medias, opt => opt.MapFrom(src => src.Medias))
            .ForMember(dest => dest.SharedPost, opt => opt.MapFrom(src => src.SharedPost));

        CreateMap<Comment, CommentResponseDto>()
            .ForMember(dest => dest.Author, opt => opt.MapFrom(src => src.User));
    }
}