using FacebookClone.API.Services;
using FacebookClone.Domain.Constants;
using Xunit;

namespace FacebookClone.UnitTests;

public class SecurityServiceTests
{
    [Fact]
    public void UnblockIp_RemovesExistingBlockAndReportsResult()
    {
        var service = new SecurityService();
        service.BlockIp("127.0.0.1", "test", false);

        Assert.True(service.IsIpBlocked("127.0.0.1"));
        Assert.True(service.UnblockIp("127.0.0.1"));
        Assert.False(service.IsIpBlocked("127.0.0.1"));
        Assert.False(service.UnblockIp("127.0.0.1"));
    }

    [Fact]
    public void ResetRateLimit_RemovesAllPathBucketsForIp()
    {
        var service = new SecurityService();
        const string ip = "127.0.0.2";

        service.IsRateLimited(ip, "/api/v1/posts");
        service.IsRateLimited(ip, "/api/v1/reels");

        Assert.Equal(2, service.ResetRateLimit(ip));
        Assert.Equal(0, service.ResetRateLimit(ip));
    }

    [Fact]
    public void GetSuspiciousIps_RanksActivityAndFindsAssociatedIdentity()
    {
        var service = new SecurityService();
        const string ip = "203.0.113.50";

        for (var i = 0; i < SharedConstants.Security.SuspiciousRequestRatePerMinute; i++)
            service.RecordRequest(ip, $"/api/v1/probe/{i}", "GET", 404, "browser");

        service.RecordFailedLogin(ip);
        service.RecordFailedLogin(ip);
        service.AssociateIdentity(ip, Guid.Parse("11111111-1111-1111-1111-111111111111"), "suspect@example.com");

        var result = Assert.Single(service.GetSuspiciousIps("suspect@example.com", SharedConstants.Security.MediumRiskScore));

        Assert.Equal(ip, result.IpAddress);
        Assert.True(result.RiskScore >= SharedConstants.Security.MediumRiskScore);
        Assert.Contains("elevated_request_rate", result.Signals);
        Assert.Contains("high_error_rate", result.Signals);
        Assert.Contains("endpoint_scanning", result.Signals);
        Assert.Contains("suspect@example.com", result.AssociatedEmails);
    }

    [Fact]
    public void RecordRequest_KeepsOnlyConfiguredMaximumSamples()
    {
        var service = new SecurityService();
        const string ip = "203.0.113.51";

        for (var i = 0; i < SharedConstants.Security.MaxSamplesPerIp + 25; i++)
            service.RecordRequest(ip, "/api/v1/posts", "GET", 200, "browser");

        var result = Assert.Single(service.GetSuspiciousIps(ip));

        Assert.Equal(SharedConstants.Security.MaxSamplesPerIp, result.RequestsLastHour);
    }
}
