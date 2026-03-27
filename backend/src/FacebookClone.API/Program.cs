using Microsoft.EntityFrameworkCore;
using FacebookClone.Infrastructure.Seed;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using FacebookClone.API.Services;
using FacebookClone.API.Extensions;
using FacebookClone.API.Filters;
using FacebookClone.API.Hubs;
using FacebookClone.Domain.Interfaces;
using FacebookClone.Application.Auth.Services;
using FacebookClone.Application.Auth.Jwt;
using FacebookClone.Application.Services.Interfaces;
using FacebookClone.Application.Services.Implementations;
using FacebookClone.Application.Mappings; // Namespace chứa UserProfile
using FacebookClone.Infrastructure;
using FacebookClone.Infrastructure.Repositories;
using Serilog;
using Microsoft.OpenApi.Models; // Dùng cho Swagger

// ---------------------------------------------------------
// 1. CẤU HÌNH SERILOG (Ghi log ngay từ khi khởi động)
// ---------------------------------------------------------
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("logs/log-.txt",
        rollingInterval: RollingInterval.Day, // Mỗi ngày tạo 1 file log mới
        retainedFileCountLimit: 14)           // 🔥 Chỉ giữ lại log trong 14 ngày (2 tuần)
    .CreateLogger();

try 
{
    var builder = WebApplication.CreateBuilder(args);

    // Kích hoạt Serilog thay thế logger mặc định của .NET
    builder.Host.UseSerilog();

    // ---------------------------------------------------------
    // 2. CONFIGURATION & DATABASE
    // ---------------------------------------------------------
    var jwtConfig = builder.Configuration.GetSection("Jwt");
    var key = Encoding.UTF8.GetBytes(jwtConfig["Secret"]!);
    var connectionString = builder.Configuration.GetConnectionString("Default");

    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(connectionString));

    // ---------------------------------------------------------
    // 3. AUTHENTICATION (JWT)
    // ---------------------------------------------------------
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtConfig["Issuer"],
                ValidAudience = jwtConfig["Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ClockSkew = TimeSpan.Zero
            };
            // SignalR WebSocket không hỗ trợ gửi header — đọc token từ query string
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];
                    var path = context.HttpContext.Request.Path;
                    if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    {
                        context.Token = accessToken;
                    }
                    return Task.CompletedTask;
                }
            };
        });

    // ---------------------------------------------------------
    // 4. DEPENDENCY INJECTION (Services, Repositories)
    // ---------------------------------------------------------
    builder.Services.AddControllers();

    builder.Services.AddSignalR(); // 👈 Kích hoạt dịch vụ SignalR

    // ✅ FIX LỖI AUTOMAPPER: Dùng cú pháp Config Action để tránh lỗi CS1503
    builder.Services.AddAutoMapper(cfg => {
        cfg.AddProfile<UserProfile>();
        cfg.AddProfile<PostProfile>(); 
    });

    builder.Services.AddScoped<INotificationHubService, NotificationHubService>();
    builder.Services.AddScoped<PostOwnerFilter>();

    builder.Services.AddScoped<IUserRepository, UserRepository>();
    builder.Services.AddScoped<IUserService, UserService>();
    builder.Services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
    builder.Services.AddScoped<IAuthService, AuthService>();
    builder.Services.AddScoped<IPostRepository, PostRepository>();
    builder.Services.AddScoped<IPostService, PostService>();
    builder.Services.AddScoped<IInteractionRepository, InteractionRepository>();
    builder.Services.AddScoped<IInteractionService, InteractionService>();
    builder.Services.AddScoped<IFileService, FileService>();
    builder.Services.AddScoped<IFriendshipRepository, FriendshipRepository>();
    builder.Services.AddScoped<IFriendshipService, FriendshipService>();
    builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
    builder.Services.AddScoped<INotificationService, NotificationService>();
    builder.Services.AddScoped<IChatRepository, ChatRepository>();
    builder.Services.AddScoped<IChatHubService, ChatHubService>();
    builder.Services.AddScoped<IChatService, ChatService>();
    builder.Services.AddScoped<IReelRepository, ReelRepository>();
    builder.Services.AddScoped<IReelService, ReelService>();
    builder.Services.AddScoped<IGroupRepository, GroupRepository>();
    builder.Services.AddScoped<IGroupService, GroupService>();
    builder.Services.AddScoped<ISearchService, SearchService>();

    // ---------------------------------------------------------
    // 5. SWAGGER (Swashbuckle) & CORS
    // ---------------------------------------------------------
    builder.Services.AddEndpointsApiExplorer();
    
    // Cấu hình Swagger UI có nút Authorize (Ổ khóa)
    builder.Services.AddSwaggerGen(option =>
    {
        option.SwaggerDoc("v1", new OpenApiInfo { Title = "Facebook Clone API", Version = "v1" });
        
        // Cấu hình nút Authorize nhập JWT
        option.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            In = ParameterLocation.Header,
            Description = "Please enter a valid token",
            Name = "Authorization",
            Type = SecuritySchemeType.Http,
            BearerFormat = "JWT",
            Scheme = "Bearer"
        });
        option.AddSecurityRequirement(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                    {
                        Type=ReferenceType.SecurityScheme,
                        Id="Bearer"
                    }
                },
                new string[]{}
            }
        });
    });

    // Cấu hình CORS (Cho phép React gọi API)
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowReactApp",
            policy =>
            {
                policy.WithOrigins("http://localhost:5173") // URL của Vite React
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials();
            });
    });

    // =========================================================
    // BUILD APPLICATION
    // =========================================================
    var app = builder.Build();

    // ---------------------------------------------------------
    // 6. MIDDLEWARES PIPELINE
    // ---------------------------------------------------------
    
    // Global Error Handling & Custom Middleware (Log, Audit...)
    app.UseGlobalMiddlewares(); 

    if (app.Environment.IsDevelopment())
    {
        // Kích hoạt Swagger UI
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    // Seed Data Command
    if (args.Contains("--seed"))
    {
        using var scope = app.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await SeedRunner.RunAsync(dbContext);
        return; 
    }

    // app.UseHttpsRedirection(); //khi deploy lên production sẽ bật lại, còn dev thì tạm thời để yên (đỡ phải cấu hình SSL cho localhost)

// load image,file tĩnh từ wwwroot (nếu có) - Cấu hình này phải đặt trước UseAuthentication nếu có liên quan đến file tĩnh
    app.UseStaticFiles();

    // Kích hoạt CORS (Đặt trước Auth)
    app.UseCors("AllowReactApp");

    app.UseAuthentication();
    app.UseAuthorization();

    app.MapControllers();
    app.MapHub<NotificationHub>("/hubs/notification"); // 👈 Mở cổng cho Frontend kết nối WebSockets
    app.MapHub<ChatHub>("/hubs/chat"); // 👈 Mở cổng Realtime cho Chat
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}