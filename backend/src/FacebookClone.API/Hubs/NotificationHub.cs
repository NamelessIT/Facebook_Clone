using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace FacebookClone.API.Hubs;

[Authorize] // Phải có Token mới được kết nối Realtime
public class NotificationHub : Hub
{
    // Cực kỳ ảo diệu: SignalR sẽ tự động đọc JWT Token của bạn,
    // trích xuất cái ID (NameIdentifier) ra và biết chính xác kết nối này là của User nào!
    // Bạn không cần viết thêm code gì ở đây lúc này.
}