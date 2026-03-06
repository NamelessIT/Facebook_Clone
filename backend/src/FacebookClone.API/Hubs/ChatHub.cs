using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace FacebookClone.API.Hubs;

[Authorize]
public class ChatHub : Hub
{
    // Cổng kết nối WebSockets dành riêng cho Chat
}