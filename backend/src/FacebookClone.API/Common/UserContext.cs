using System.Security.Claims;

namespace FacebookClone.API.Common;

public static class UserContext
{
    public static Guid GetUserId(ClaimsPrincipal user)
    {
        var id = user.FindFirstValue(ClaimTypes.NameIdentifier)
              ?? user.FindFirstValue(JwtRegisteredClaimNames.Sub);

        return Guid.Parse(id!);
    }
}
