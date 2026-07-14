using System.IdentityModel.Tokens.Jwt;
using FacebookClone.Application.Auth.Jwt;
using FacebookClone.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace FacebookClone.UnitTests;

public class JwtTokenGeneratorTests
{
    private static IConfiguration BuildConfig() =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"] = "TEST_SECRET_KEY_THAT_IS_LONG_ENOUGH_FOR_HMACSHA256_XXXX",
                ["Jwt:Issuer"] = "FacebookCloneTest",
                ["Jwt:Audience"] = "FacebookCloneTestClient",
                ["Jwt:AccessTokenMinutes"] = "15"
            })
            .Build();

    [Fact]
    public void GenerateAccessToken_embeds_user_claims()
    {
        var gen = new JwtTokenGenerator(BuildConfig());
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "test@fbclone.com",
            FirstName = "Test",
            LastName = "User",
            PasswordHash = "x"
        };

        var token = gen.GenerateAccessToken(user);
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        Assert.Equal("FacebookCloneTest", jwt.Issuer);
        Assert.Contains(jwt.Claims, c => c.Type == JwtRegisteredClaimNames.Email && c.Value == user.Email);
        Assert.Contains(jwt.Claims, c => c.Value == user.Id.ToString());
    }

    [Fact]
    public void GenerateRefreshToken_is_unique_and_nonempty()
    {
        var gen = new JwtTokenGenerator(BuildConfig());
        var a = gen.GenerateRefreshToken();
        var b = gen.GenerateRefreshToken();

        Assert.False(string.IsNullOrWhiteSpace(a));
        Assert.NotEqual(a, b);
    }
}
