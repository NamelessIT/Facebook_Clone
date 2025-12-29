# 📘 DỰ ÁN: FACEBOOK_CLONE (FULLSTACK – CÁ NHÂN)

## 1. Mục tiêu dự án

Xây dựng một website mô phỏng Facebook với **đầy đủ các chức năng cốt lõi**, kiến trúc rõ ràng, code sạch, dễ mở rộng, có thể chạy thật trên môi trường production (Docker + Cloud).

* Người phát triển: **1 người**
* Định hướng: **Fullstack – Production-ready**

---

## 2. Chia Git như thế nào? (RẤT QUAN TRỌNG)

### ✅ Khuyến nghị: **1 Git – 2 folder**

```text
facebook_clone/
├── backend/
│   ├── services/
│   ├── gateway/
│   ├── docker/
│   └── docker-compose.yml
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── vite.config.js
│
├── docs/
│   ├── api-spec/
│   ├── db-design/
│   └── architecture.md
│
└── README.md
```

## 4. Kiến trúc tổng thể

### 4.1 Kiến trúc backend (Microservice nhẹ)

```text
[Frontend React]
      |
[API Gateway]
      |
-------------------------------------------------
| Auth Service | User Service | Post Service    |
| Chat Service | Media Service| Notification   |
-------------------------------------------------
      |
   [Database]
```

### Tạo các project (CÓ LỆNH HẾT):
```
🔹 API (Web API – startup project)
dotnet new webapi -n FacebookClone.API

🔹 Domain (Entity)
dotnet new classlib -n FacebookClone.Domain

🔹 Infrastructure (EF Core)
dotnet new classlib -n FacebookClone.Infrastructure

🔹 Application (Service – để sau)
dotnet new classlib -n FacebookClone.Application
```

### Thêm project vào solution
```
Quay về thư mục backend:

cd ..
dotnet sln add src/FacebookClone.API
dotnet sln add src/FacebookClone.Domain
dotnet sln add src/FacebookClone.Infrastructure
dotnet sln add src/FacebookClone.Application
```

### Thiết lập reference giữa các project
```
dotnet add src/FacebookClone.API reference src/FacebookClone.Application
dotnet add src/FacebookClone.Application reference src/FacebookClone.Domain
dotnet add src/FacebookClone.Infrastructure reference src/FacebookClone.Domain
dotnet add src/FacebookClone.API reference src/FacebookClone.Infrastructure
```

### Cài package EF Core (Infrastructure)
```
cd src/FacebookClone.Infrastructure

dotnet add package Microsoft.EntityFrameworkCore
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
```

### Cài DotNetEnv (API)
```
cd ../FacebookClone.API
dotnet add package DotNetEnv
```

### Cài EF CLI(1 lần)
```
dotnet tool install --global dotnet-ef
```

### Tạo migration
```
👉 Chạy ở thư mục backend

dotnet ef migrations add InitialCreate \
  --project src/FacebookClone.Infrastructure \
  --startup-project src/FacebookClone.API
```

### Apply migration
```
dotnet ef database update \
  --project src/FacebookClone.Infrastructure \
  --startup-project src/FacebookClone.API
```

### 4.2 Các service chính

1. **Auth Service**

   * Login / Register
   * JWT + Refresh Token
   * OAuth (Google – optional)
   🔐 JWT Design 적용

# Áp dụng cho:
- AuthService (generate token)
- API Gateway (verify token)
- UserService / PostService / ChatService (read claim)

# Claims sử dụng:
- sub → userId
- email
- name
- exp, iat

# KHÔNG lưu JWT trong database.

# File liên quan:
- Application/Auth/Jwt/IJwtTokenGenerator.cs
- Application/Auth/Jwt/JwtTokenGenerator.cs
- API/Program.cs (JWT middleware)


2. **User Service**

   * Hồ sơ cá nhân
   * Trạng thái online
   * Cập nhật thông tin

3. **Post Service**

   * Đăng bài
   * Like, Share, Save
   * Comment
   * Cảm xúc nhanh (reaction)

4. **Chat Service (Real-time)**

   * 1-1 chat
   * Group chat
   * Online / typing
   * WebSocket / SignalR

5. **Media Service**

   * Upload ảnh
   * Video (Reels)
   * Thumbnail
   * Storage (Cloudinary / S3)

6. **Notification Service**

   * Like / comment / friend request
   * Realtime + lưu DB

---

## 📄 Swagger (OpenAPI)

Áp dụng cho:
- TẤT CẢ backend services

Mục đích:
- API contract giữa Backend ↔ Frontend
- Test API nhanh
- Tránh mismatch request/response

Triển khai tại:
- FacebookClone.API
- File: Program.cs

Quy ước:
- Mọi API phải xuất hiện trong Swagger
- Prefix: /api/v1
- Authentication: Bearer JWT


## 5. Công nghệ sử dụng

### 5.1 Frontend

* **ReactJS + Vite**
* TypeScript
* React Query / TanStack Query
* Zustand / Redux Toolkit
* TailwindCSS (hoặc SCSS module)
* Axios
* Socket.IO client

#### Cấu trúc frontend

```text
src/
├── components/
│   ├── common/
│   ├── post/
│   ├── chat/
│   └── ui/
├── pages/
├── hooks/
├── services/
├── store/
├── theme/
└── utils/
```

### 🎨 Màu sắc & theme (RẤT QUAN TRỌNG)

* Primary: `#1877F2` (Facebook blue)
* Background: `#F0F2F5`
* Text: `#050505`
* Border: `#CED0D4`

👉 Dùng **theme config**

```ts
export const theme = {
  colors: {
    primary: "#1877F2",
    bg: "#F0F2F5",
    text: "#050505",
  }
};
```

---

### 5.2 Backend (.NET)

* ASP.NET Core Web API
* Entity Framework Core
* Dapper (query phức tạp)
* SignalR (chat realtime)
* JWT Authentication
* FluentValidation
* AutoMapper

### 5.3 Database

* PostgreSQL (khuyến nghị)
* Redis (cache + online status)
* Elasticsearch (search – optional)

---

### 5.4 DevOps

* Docker
* Docker Compose
* Nginx (reverse proxy)
* CI/CD (GitHub Actions – optional)
* Deploy:

  * VPS / AWS / DigitalOcean

---

## 6. Danh sách chức năng (ĐẦY ĐỦ)

### 👤 Người dùng

* Đăng ký / đăng nhập
* Trang cá nhân
* Avatar, cover
* Trạng thái hiện tại

### 📰 Bài viết

* Đăng bài (text, ảnh, video)
* Like / reaction
* Comment
* Share
* Save bài
* Quyền riêng tư

### 🎥 Reels / Short Video

* Upload video ngắn
* Scroll auto-play
* Like / comment
* Lưu video

### 💬 Chat realtime

* Chat 1-1
* Chat nhóm
* Seen / typing
* Online status

📌 WebSocket / SignalR KHÔNG áp dụng cho AuthService
Chỉ dùng cho:
- ChatService
- NotificationService


### 👥 Bạn bè

* Gửi lời mời
* Chấp nhận / từ chối
* Hủy kết bạn
* Gợi ý bạn bè

### 🧠 Cảm xúc nhanh

* Đang cảm thấy: vui, buồn, mệt, yêu…

### 🔍 Tìm kiếm

* Người dùng
* Bài viết
* Group

### 👨‍👩‍👧‍👦 Group

* Tạo group
* Post trong group
* Phân quyền admin

### 🔔 Thông báo

* Realtime
* Lưu lịch sử

---

## 7. Phân chia thời gian (3 tháng)

### 🟢 Tháng 1 – Nền tảng

* Setup repo
* Auth + User
* UI layout
* Post cơ bản
* Database design

### 🟡 Tháng 2 – Core features

* Like / comment / share
* Friend system
* Chat realtime
* Notification

### 🔵 Tháng 3 – Nâng cao & deploy

* Reels
* Group
* Search
* Docker
* Deploy production
* Fix bug + tối ưu

---

## 8. Lưu ý quan trọng (đừng bỏ qua)

* ❗ Không làm tất cả cùng lúc
* ❗ Ưu tiên **core flow**
* ❗ Viết README rõ
* ❗ Commit nhỏ – rõ ràng
* ❗ Tối ưu UX trước fancy feature

---


## 9. Chi tiết kế hoạch (QUAN TRỌNG):

# 📅 KẾ HOẠCH CHI TIẾT 3 THÁNG – FACEBOOK_CLONE

---

# 🟢 THÁNG 1 – NỀN TẢNG (CORE FOUNDATION)

## 1️⃣ Setup Repository & Kiến trúc

### 📂 Cấu trúc repo

```text
facebook_clone/
├── backend/
│   ├── services/
│   │   ├── AuthService
│   │   ├── UserService
│   │   └── PostService
│   ├── ApiGateway
│   ├── SharedKernel
│   └── docker-compose.yml
│
├── frontend/
│   ├── src/
│   └── vite.config.ts
│
└── docs/
```

### 📌 Quy ước chung

* API: `/api/v1/...`
* ID: `uuid`
* Auth: `Authorization: Bearer <token>`
* Response chuẩn:

```json
{
  "success": true,
  "data": {},
  "message": ""
}
```

---

## 2️⃣ Auth + User Service

### 🔐 Auth Service

#### Chức năng

* Đăng ký
* Đăng nhập
* Refresh token
* Logout

#### API chuẩn

```http
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh-token
POST   /api/v1/auth/logout
```

#### Flow login

1. User gửi email + password
2. AuthService:

   * Validate
   * Hash password
   * Generate access + refresh token
3. Trả token cho frontend
4. Frontend lưu access token (memory) + refresh token (httpOnly cookie)

---

### 👤 User Service

#### Chức năng

* Profile
* Update info
* Status hiện tại

#### API

```http
GET    /api/v1/users/me
GET    /api/v1/users/{userId}
PUT    /api/v1/users/me
PATCH  /api/v1/users/status
```

#### Status ví dụ

```json
{
  "status": "Feeling happy 😊"
}
```

---

## 3️⃣ UI Layout (Frontend)

### Layout chính

* Header
* Left Sidebar
* Feed
* Right Sidebar

### Component core

```text
Layout/
├── MainLayout
├── Header
├── SidebarLeft
├── SidebarRight
└── FeedLayout
```

### Lưu ý

* Chưa cần đẹp
* Ưu tiên **component tái sử dụng**
* Tạo `theme.ts` ngay từ đầu

---

## 4️⃣ Post cơ bản

### 📝 Post Service

#### Chức năng

* Tạo post
* Lấy feed
* Xóa post

#### API

```http
POST   /api/v1/posts
GET    /api/v1/posts/feed
GET    /api/v1/posts/{postId}
DELETE /api/v1/posts/{postId}
```

#### Tạo post

```json
{
  "content": "Hello Facebook Clone",
  "mediaUrls": [],
  "privacy": "PUBLIC"
}
```

---

## 5️⃣ Database design (v1)
```
### Core tables

📐 ERD – THIẾT KẾ CHI TIẾT (DẠNG BẢNG)
1️⃣ users (BẢNG GỐC)
users
-----
id (uuid, PK)
email (varchar, unique)
password_hash (varchar)
full_name (varchar)
avatar_url (text)
cover_url (text)
bio (text)
status (varchar)
is_online (boolean)
created_at (timestamp)
updated_at (timestamp)
is_deleted (boolean)   // soft delete

🔹 Trung tâm của toàn bộ hệ thống
🔹 1 user → nhiều post, comment, message

2️⃣ posts
posts
-----
id (uuid, PK)
user_id (uuid, FK → users.id)
content (text)
privacy (enum: PUBLIC, FRIENDS, PRIVATE)
post_type (enum: NORMAL, SHARE, GROUP)
group_id (uuid, nullable)
shared_post_id (uuid, nullable, FK → posts.id)
created_at
updated_at
is_deleted (boolean)


🔹 Một post có thể share post khác
🔹 shared_post_id tạo self-referencing relationship

3️⃣ comments
comments
--------
id (uuid, PK)
post_id (uuid, FK → posts.id)
user_id (uuid, FK → users.id)
parent_comment_id (uuid, nullable, FK → comments.id)
content (text)
created_at
is_deleted (boolean)


🔹 Comment lồng nhau (reply)
🔹 parent_comment_id là weak relationship

4️⃣ reactions (LIKE / LOVE / HAHA …)

👉 BẢNG TRUNG GIAN QUAN TRỌNG

reactions
---------
id (uuid, PK)
user_id (uuid, FK → users.id)
post_id (uuid, FK → posts.id)
reaction_type (enum: LIKE, LOVE, HAHA, WOW, SAD, ANGRY)
created_at

UNIQUE (user_id, post_id)


🔹 1 user chỉ reaction 1 lần / post
🔹 Thay reaction = update record

5️⃣ friendships (BẢNG QUAN HỆ N-N)
friendships
-----------
id (uuid, PK)
requester_id (uuid, FK → users.id)
receiver_id (uuid, FK → users.id)
status (enum: PENDING, ACCEPTED, REJECTED, BLOCKED)
created_at
updated_at

UNIQUE (requester_id, receiver_id)
CHECK (requester_id != receiver_id)


🔹 Đây là bảng yếu (junction table)
🔹 Đại diện cho mối quan hệ phức tạp user ↔ user

6️⃣ conversations (CHAT)
conversations
-------------
id (uuid, PK)
type (enum: PRIVATE, GROUP)
created_at
created_by (uuid, FK → users.id)

7️⃣ conversation_members (BẢNG TRUNG GIAN CHAT)
conversation_members
--------------------
conversation_id (uuid, FK → conversations.id)
user_id (uuid, FK → users.id)
joined_at

PRIMARY KEY (conversation_id, user_id)


🔹 Cho phép:

1–1 chat

Group chat

8️⃣ messages
messages
--------
id (uuid, PK)
conversation_id (uuid, FK → conversations.id)
sender_id (uuid, FK → users.id)
content (text)
message_type (enum: TEXT, IMAGE, VIDEO, FILE)
created_at
is_deleted (boolean)

📌 Cho phép:
“Delete for me”
“Delete for everyone”

9️⃣ notifications
notifications
-------------
id (uuid, PK)
user_id (uuid, FK → users.id)
type (enum: LIKE, COMMENT, FRIEND_REQUEST, MESSAGE)
reference_id (uuid)
is_read (boolean)
created_at
actor_id (uuid, FK → users.id)  // ai gây ra notification


🔹 reference_id trỏ tới post/comment/message tùy loại
📌 Ví dụ:
A like post của B → notification của B
→ actor_id = A

🔟 reels (VIDEO NGẮN)
reels
-----
id (uuid, PK)
user_id (uuid, FK → users.id)
video_url (text)
caption (text)
created_at
is_deleted (boolean)


1️⃣1️⃣ reel_likes (BẢNG YẾU)
reel_likes
----------
reel_id (uuid, FK → reels.id)
user_id (uuid, FK → users.id)
created_at

PRIMARY KEY (reel_id, user_id)

1️⃣2️⃣ groups
groups
------
id (uuid, PK)
name (varchar)
description (text)
owner_id (uuid, FK → users.id)
created_at
privacy (PUBLIC, PRIVATE)


1️⃣3️⃣ group_members (BẢNG TRUNG GIAN)
group_members
-------------
group_id (uuid, FK → groups.id)
user_id (uuid, FK → users.id)
role (enum: ADMIN, MEMBER)
joined_at

PRIMARY KEY (group_id, user_id)


refresh_tokens
--------------
id (uuid, PK)
user_id (uuid, FK → users.id)
token (varchar, unique)
expires_at (timestamp)
is_revoked (boolean)
created_at (timestamp)
revoked_at (timestamp, nullable)

📌 Refresh Token Strategy

Sử dụng cho:
- AuthService

Flow sử dụng:
- Login → tạo refresh token
- Refresh-token → revoke token cũ, tạo token mới
- Logout → revoke token

File liên quan:
- Domain/Entities/RefreshToken.cs
- Infrastructure/Configurations/RefreshTokenConfiguration.cs
- Infrastructure/AppDbContext.cs
- Application/Auth (AuthService logic)

Đảm bảo:
- Idempotent
- Transaction

### 🔁 Transaction & Idempotent Design

Áp dụng cho các API:
- POST /auth/login
- POST /auth/refresh-token
- POST /auth/logout
- POST /posts/{postId}/like
- POST /friends/request/{userId}

Nguyên tắc:
- Một request gọi nhiều lần → kết quả không thay đổi
- Dùng database transaction cho các bước quan trọng

Áp dụng tại:
- Application layer (Service)
- Infrastructure layer (DbContext transaction)

```

### Entities
```
public class Comment
{
    public Guid Id { get; set; }

    public Guid PostId { get; set; }
    public Post Post { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid? ParentCommentId { get; set; }
    public Comment? ParentComment { get; set; }

    public string Content { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public bool IsDeleted { get; set; }

    /* Navigation */
    public ICollection<Comment> Replies { get; set; } = new List<Comment>();
}
public class Conversation
{
    public Guid Id { get; set; }

    public ConversationType Type { get; set; }

    public Guid CreatedBy { get; set; }
    public User Creator { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    /* Navigation */
    public ICollection<ConversationMember> Members { get; set; } = new List<ConversationMember>();
    public ICollection<Message> Messages { get; set; } = new List<Message>();
}
public class ConversationMember
{
    public Guid ConversationId { get; set; }
    public Conversation Conversation { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public DateTime JoinedAt { get; set; }
}
public class Friendship
{
    public Guid Id { get; set; }

    public Guid RequesterId { get; set; }
    public User Requester { get; set; } = null!;

    public Guid ReceiverId { get; set; }
    public User Receiver { get; set; } = null!;

    public FriendshipStatus Status { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
public class Group
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;
    public string? Description { get; set; }

    public Guid OwnerId { get; set; }
    public User Owner { get; set; } = null!;

    public GroupPrivacy Privacy { get; set; }

    public DateTime CreatedAt { get; set; }

    /* Navigation */
    public ICollection<GroupMember> Members { get; set; } = new List<GroupMember>();
}
public class GroupMember
{
    public Guid GroupId { get; set; }
    public Group Group { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public GroupRole Role { get; set; }

    public DateTime JoinedAt { get; set; }
}
public class Message
{
    public Guid Id { get; set; }

    public Guid ConversationId { get; set; }
    public Conversation Conversation { get; set; } = null!;

    public Guid SenderId { get; set; }
    public User Sender { get; set; } = null!;

    public string Content { get; set; } = null!;

    public MessageType MessageType { get; set; }

    public DateTime CreatedAt { get; set; }

    public bool IsDeleted { get; set; }
}
public class Notification
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public NotificationType Type { get; set; }

    public Guid ReferenceId { get; set; }

    public bool IsRead { get; set; }

    public DateTime CreatedAt { get; set; }

    public Guid ActorId { get; set; }
    public User Actor { get; set; } = null!;
}
public class Post
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Content { get; set; } = null!;

    public PostPrivacy Privacy { get; set; }
    public PostType PostType { get; set; }

    public Guid? GroupId { get; set; }

    public Guid? SharedPostId { get; set; }
    public Post? SharedPost { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public bool IsDeleted { get; set; }

    /* Navigation */
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    public ICollection<Reaction> Reactions { get; set; } = new List<Reaction>();
}
public class Reaction
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid PostId { get; set; }
    public Post Post { get; set; } = null!;

    public ReactionType ReactionType { get; set; }

    public DateTime CreatedAt { get; set; }
}
public class Reel
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string VideoUrl { get; set; } = null!;
    public string? Caption { get; set; }

    public DateTime CreatedAt { get; set; }

    public bool IsDeleted { get; set; }

    /* Navigation */
    public ICollection<ReelLike> Likes { get; set; } = new List<ReelLike>();
}
public class ReelLike
{
    public Guid ReelId { get; set; }
    public Reel Reel { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public DateTime CreatedAt { get; set; }
}
public class User
{
    public Guid Id { get; set; }

    public string Email { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public string FullName { get; set; } = null!;

    public string? AvatarUrl { get; set; }
    public string? CoverUrl { get; set; }
    public string? Bio { get; set; }
    public string? Status { get; set; }

    public bool IsOnline { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public bool IsDeleted { get; set; }

    /* Navigation */
    public ICollection<Post> Posts { get; set; } = new List<Post>();
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    public ICollection<Message> Messages { get; set; } = new List<Message>();
}

public class RefreshToken
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Token { get; set; } = null!;

    public DateTime ExpiresAt { get; set; }

    public bool IsRevoked { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? RevokedAt { get; set; }
}

```

# 🟡 THÁNG 2 – CORE FEATURES

---

## 6️⃣ Like / Comment / Share

### ❤️ Like

```http
POST   /api/v1/posts/{postId}/like
DELETE /api/v1/posts/{postId}/like
```

* 1 user = 1 like / post

---

### 💬 Comment

```http
POST   /api/v1/posts/{postId}/comments
GET    /api/v1/posts/{postId}/comments
```

---

### 🔁 Share

```http
POST   /api/v1/posts/{postId}/share
```

* Tạo post mới
* Link tới post gốc

---

## 7️⃣ Friend System

### API

```http
POST   /api/v1/friends/request/{userId}
POST   /api/v1/friends/accept/{requestId}
POST   /api/v1/friends/reject/{requestId}
DELETE /api/v1/friends/{userId}
GET    /api/v1/friends/list
GET    /api/v1/friends/requests
```

### Flow

1. Gửi request
2. Chờ accept
3. Tạo friendship

---

## 8️⃣ Chat Realtime (SignalR)

### Hub

```text
/chatHub
```

### API

```http
GET /api/v1/chats
GET /api/v1/chats/{conversationId}
```

### Event

```text
sendMessage
receiveMessage
typing
onlineStatus
```

---

## 9️⃣ Notification

### API

```http
GET /api/v1/notifications
PATCH /api/v1/notifications/{id}/read
```

### Trigger từ:

* Like
* Comment
* Friend request
* Message

---

# 🔵 THÁNG 3 – NÂNG CAO & DEPLOY

---

## 🔟 Reels (Short Video)

### API

```http
POST /api/v1/reels
GET  /api/v1/reels/feed
POST /api/v1/reels/{id}/like
```

### Lưu ý

* Auto play
* Giới hạn thời lượng

---

---

### 🎥 Media (Video)

**API**

```http
POST /api/v1/media/upload/init
POST /api/v1/media/upload/chunk
POST /api/v1/media/upload/complete
```

🎥 Chunking Strategy (Media / Video)

Áp dụng cho:
- MediaService
- Reels
- Video Post

Frontend:
- Chia video thành chunk (5–10MB)
- Upload tuần tự hoặc song song

Backend:
- Lưu chunk tạm
- Kiểm tra thứ tự chunk
- Merge khi upload hoàn tất

Mục tiêu:
- Tránh timeout
- Resume upload
- UX tốt với file lớn


---

## 1️⃣1️⃣ Group

### API

```http
POST   /api/v1/groups
GET    /api/v1/groups/{id}
POST   /api/v1/groups/{id}/join
POST   /api/v1/groups/{id}/post
```

---

## 1️⃣2️⃣ Search

### API

```http
GET /api/v1/search?q=keyword&type=post,user,group
```

---

## 1️⃣3️⃣ Docker

* Frontend
* Backend services
* Database
* Nginx

---

## 1️⃣4️⃣ Deploy & Optimize

API Gateway :
Routing request đến đúng microservice
Authentication/Authorization
Rate limiting
Logging
Aggregation (kết hợp dữ liệu từ nhiều service)

* Domain
* HTTPS
* Rate limit
* Cache Redis
* Fix UX

---

## 🧩 Design – Service Mapping

| Design | Auth | User | Post | Chat | Media |
|------|------|------|------|------|------|
| JWT | ✅ | ✅ | ✅ | ✅ | ❌ |
| Refresh Token | ✅ | ❌ | ❌ | ❌ | ❌ |
| Transaction | ✅ | ✅ | ✅ | ❌ | ❌ |
| Idempotent | ✅ | ✅ | ✅ | ❌ | ❌ |
| Swagger | ✅ | ✅ | ✅ | ✅ | ✅ |
| WebSocket | ❌ | ❌ | ❌ | ✅ | ❌ |
| Chunking | ❌ | ❌ | ❌ | ❌ | ✅ |



