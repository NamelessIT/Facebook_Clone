namespace FacebookClone.Application.Services.Interfaces;

public interface INotificationHubService
{
    Task SendNotificationToUserAsync(Guid userId, string message);
}