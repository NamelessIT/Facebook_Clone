Ok, tui sẽ viết cho bạn **một bản mô tả dự án Facebook_Clone ở mức “proposal + technical design + roadmap”**, đủ chi tiết để:

* Làm **đồ án cá nhân nghiêm túc**
* Có thể **mở rộng thật**
* Dùng để **show CV / GitHub**
* Có định hướng **deploy + Docker**

Tui sẽ chia rõ ràng, đọc tới đâu hiểu tới đó 👇

---

# 📘 DỰ ÁN: FACEBOOK_CLONE (FULLSTACK – CÁ NHÂN)

## 1. Mục tiêu dự án

Xây dựng một website mô phỏng Facebook với **đầy đủ các chức năng cốt lõi**, kiến trúc rõ ràng, code sạch, dễ mở rộng, có thể chạy thật trên môi trường production (Docker + Cloud).

* Người phát triển: **1 người (bạn)**
* Định hướng: **Fullstack – Production-ready**
* Mục tiêu cuối:

  * Có demo online
  * Code đủ tốt để nhà tuyển dụng đọc
  * Có thể mở rộng thành mạng xã hội thật

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

### ❌ Không nên chia 2 git riêng (vì):

* Làm **1 mình**
* Khó đồng bộ version
* Khó quản lý deploy

👉 **1 repo – rõ ràng – chuyên nghiệp**
Sau này nếu team lớn → tách repo sau.

---

## 3. Chọn Backend: .NET Microservice hay Spring Boot?

### 🔥 So sánh nhanh

| Tiêu chí         | .NET (C#)  | Spring Boot (Java) |
| ---------------- | ---------- | ------------------ |
| Hiệu năng        | ⭐⭐⭐⭐☆      | ⭐⭐⭐⭐               |
| Microservice     | Rất mạnh   | Rất mạnh           |
| Docker           | Tốt        | Tốt                |
| Code gọn         | Rất gọn    | Hơi verbose        |
| Learning curve   | Trung bình | Cao hơn            |
| Phù hợp solo dev | ✅ Rất hợp  | ⚠️ Nặng            |
| Cơ hội việc làm  | Cao        | Rất cao            |

### ✅ Kết luận cho **dự án này**

👉 **CHỌN: .NET (ASP.NET Core) + Microservice (vừa phải)**

Lý do:

* Bạn làm **một mình**
* Microservice full Java sẽ **quá tải**
* .NET viết nhanh, clean, dễ Docker

> Spring Boot chỉ nên dùng nếu bạn **đang ôn Java backend chuyên sâu** cho học phần / công việc Java.

---

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

### 4.2 Các service chính

1. **Auth Service**

   * Login / Register
   * JWT + Refresh Token
   * OAuth (Google – optional)

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
Rất tốt 👍
Bây giờ tui sẽ làm **bản phân chia công việc ở mức “thiết kế kỹ thuật + nghiệp vụ”**, để khi bạn code:

* ❌ **không bị mơ hồ**
* ❌ **không đặt tên API lung tung**
* ✅ **code tới đâu khớp kiến trúc tới đó**
* ✅ **dễ mở rộng, không phá logic cũ**

Tui sẽ viết theo **chuẩn backend thực tế**, kèm:

* Luồng hoạt động (flow)
* Tên service
* Tên API (REST)
* Gợi ý DB
* Lưu ý quan trọng

---

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

### Core tables

```text
users
posts
comments
likes
friendships
```

#### users

* id
* email
* password_hash
* name
* avatar
* status

#### posts

* id
* user_id
* content
* privacy
* created_at

---

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

* Domain
* HTTPS
* Rate limit
* Cache Redis
* Fix UX

---

# 🎯 TỔNG KẾT

Sau 3 tháng bạn sẽ có:

* Một **Facebook Clone thật sự**
* Kiến trúc rõ ràng
* API chuẩn
* Có thể deploy

---



