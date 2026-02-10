using FacebookClone.Application.DTOs.User;
using FacebookClone.Application.Services.Interfaces;
using FacebookClone.Domain.Entities;
using FacebookClone.Domain.Exceptions; // Giả sử bạn đã có Custom Exception
using FacebookClone.Domain.Interfaces; // Repository Interfaces
using AutoMapper; // Khuyên dùng AutoMapper để map Entity -> DTO

namespace FacebookClone.Application.Services.Implementations;
public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private readonly IMapper _mapper;

    public UserService(IUserRepository userRepository, IMapper mapper)
    {
        _userRepository = userRepository;
        _mapper = mapper;
    }

    public async Task<UserProfileDto> GetProfileAsync(Guid userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
            throw new NotFoundException("User not found");

        return _mapper.Map<UserProfileDto>(user);
    }

    public async Task<UserProfileDto> UpdateProfileAsync(Guid userId, UpdateProfileDto request)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
            throw new NotFoundException("User not found");

        // Cập nhật từng trường nếu có giá trị
        if (!string.IsNullOrEmpty(request.FirstName)) user.FirstName = request.FirstName;
        if (!string.IsNullOrEmpty(request.LastName)) user.LastName = request.LastName;
        if (request.Bio != null) user.Bio = request.Bio;
        if (request.Location != null) user.Location = request.Location;
        if (request.AvatarUrl != null) user.AvatarUrl = request.AvatarUrl;

        await _userRepository.UpdateAsync(user);

        return _mapper.Map<UserProfileDto>(user);
    }
}