using Microsoft.EntityFrameworkCore;
using FacebookClone.Infrastructure.Seed;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using FacebookClone.API.Services;
using FacebookClone.API.Middlewares;
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
// 0. NẠP FILE .env (nếu có) TRƯỚC MỌI THỨ
// DotNetEnv sẽ đưa các biến "Section__Key" vào Environment,
// ASP.NET Core Configuration tự đọc chúng và override appsettings.json.
// TraversePath: tìm .env từ thư mục hiện tại đi ngược lên (repo root).
// ---------------------------------------------------------
DotNetEnv.Env.TraversePath().Load();

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

    // Rate limiting: global + per-module policies (config "RateLimits")
    builder.Services.AddAppRateLimiting(builder.Configuration);

    // Distributed cache: Redis when "Redis:ConnectionString" is set, else in-memory.
    var redisConn = builder.Configuration["Redis:ConnectionString"];
    if (!string.IsNullOrWhiteSpace(redisConn))
    {
        builder.Services.AddStackExchangeRedisCache(o =>
        {
            o.Configuration = redisConn;
            o.InstanceName = "fbclone:";
        });
        Log.Information("Distributed cache: Redis ({Conn})", redisConn);
    }
    else
    {
        builder.Services.AddDistributedMemoryCache();
        Log.Information("Distributed cache: in-memory (Redis not configured)");
    }
    builder.Services.AddScoped<ICacheService, CacheService>();

    builder.Services.AddSignalR(); // 👈 Kích hoạt dịch vụ SignalR

    // ✅ FIX LỖI AUTOMAPPER: Dùng cú pháp Config Action để tránh lỗi CS1503
    builder.Services.AddAutoMapper(cfg => {
        cfg.AddProfile<UserProfile>();
        cfg.AddProfile<PostProfile>(); 
    });

    // Security service (Singleton — in-memory state across requests)
    builder.Services.AddSingleton<ISecurityService, SecurityService>();

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
    builder.Services.AddScoped<IPostInteractionRepository, PostInteractionRepository>();
    builder.Services.AddScoped<IPostInteractionService, PostInteractionService>();
    builder.Services.AddScoped<ISavedCollectionRepository, SavedCollectionRepository>();
    builder.Services.AddScoped<ISavedCollectionService, SavedCollectionService>();
    builder.Services.AddScoped<ISecurityBlockRepository, SecurityBlockRepository>();
    builder.Services.AddScoped<ISecurityBlockService, SecurityBlockService>();
    builder.Services.AddScoped<IInternalTranslationService, InternalTranslationService>();
    builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

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

    // Cấu hình CORS — whitelist từ config "Cors:AllowedOrigins" (env-overridable),
    // fallback về Vite dev origin nếu chưa cấu hình.
    var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
    if (allowedOrigins is null || allowedOrigins.Length == 0)
    {
        allowedOrigins = new[]
        {
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:4173",
            "http://127.0.0.1:4173"
        };
    }
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowReactApp",
            policy =>
            {
                policy.WithOrigins(allowedOrigins)
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials();
            });
    });

    // Secret hygiene: fail fast in Production if the placeholder JWT secret is still in use.
    if (builder.Environment.IsProduction())
    {
        var secret = jwtConfig["Secret"];
        if (string.IsNullOrWhiteSpace(secret) || secret.Contains("CHANGE_LATER"))
        {
            throw new InvalidOperationException(
                "Jwt:Secret is not configured for Production. Set it via env (Jwt__Secret) / secrets store.");
        }
    }

    // =========================================================
    // BUILD APPLICATION
    // =========================================================
    var app = builder.Build();

    // ---------------------------------------------------------
    // 6. MIDDLEWARES PIPELINE
    // ---------------------------------------------------------
    
    // Security headers on every response (before anything writes a body)
    app.UseMiddleware<SecurityHeadersMiddleware>();

    // Global Error Handling & Custom Middleware (Log, Audit...)
    app.UseGlobalMiddlewares();

    // CORS must run before middlewares that can short-circuit responses
    // (rate limit, IP block), otherwise browsers report them as network errors.
    app.UseCors("AllowReactApp");

    // Security middleware: rate limiting, IP blocking, payload inspection
    app.UseMiddleware<SecurityMiddleware>();

    if (app.Environment.IsDevelopment())
    {
        // Kích hoạt Swagger UI
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    // ---------------------------------------------------------
    // 6.1 DATABASE BOOTSTRAP: kết nối → tạo DB (nếu chưa có) →
    //     apply migrations (tạo/sửa/xóa table) → seed data.
    // Bật/tắt qua .env: Database__AutoMigrate / Database__AutoSeed.
    // Chạy "dotnet run -- --seed" để chỉ seed rồi thoát.
    // ---------------------------------------------------------
    var seedOnly = args.Contains("--seed");
    var autoMigrate = app.Configuration.GetValue("Database:AutoMigrate", true);
    var autoSeed = app.Configuration.GetValue("Database:AutoSeed", true);

    if (seedOnly || autoMigrate || autoSeed)
    {
        using var scope = app.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        if (seedOnly || autoMigrate)
        {
            Log.Information("Applying database migrations (creates database if missing)...");
            await dbContext.Database.MigrateAsync();
            Log.Information("Database schema is up to date.");
        }

        if (seedOnly || autoSeed)
        {
            await SeedRunner.RunAsync(dbContext);
        }

        if (seedOnly)
        {
            Log.Information("Seed-only run finished. Exiting.");
            return;
        }
    }

    // app.UseHttpsRedirection(); //khi deploy lên production sẽ bật lại, còn dev thì tạm thời để yên (đỡ phải cấu hình SSL cho localhost)

// load image,file tĩnh từ wwwroot (nếu có) - đặt sau UseCors để static files có CORS headers
    app.UseStaticFiles();

    app.UseAuthentication();

    // Persistent block/allow list enforcement (after auth so user/email claims exist)
    app.UseMiddleware<PersistentBlockMiddleware>();

    app.UseAuthorization();

    // Rate limiter must run after auth so policies can partition by userId
    app.UseRateLimiter();

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
