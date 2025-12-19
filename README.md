# 📘 Facebook Clone – Fullstack Social Network

Một dự án **Facebook Clone** được xây dựng từ đầu với mục tiêu mô phỏng các chức năng cốt lõi của Facebook, áp dụng kiến trúc hiện đại, code sạch, dễ mở rộng và có khả năng deploy production bằng Docker.

* 👤 Developer: **Solo Developer**
* 🏗 Architecture: **Microservice (lightweight)**
* 🌐 Frontend: **ReactJS + Vite**
* ⚙️ Backend: **ASP.NET Core (.NET)**
* 🚀 Deploy: **Docker + VPS / Cloud**

---

# 🖥 FRONTEND

## 1. Công nghệ sử dụng

* ReactJS + Vite
* TypeScript
* React Router
* TanStack Query (React Query)
* Zustand (State Management)
* Axios
* TailwindCSS (hoặc SCSS Module)
* Socket.IO Client / SignalR Client

---

## 2. Cấu trúc thư mục frontend

```text
frontend/
├── src/
│   ├── assets/          # icons, images
│   ├── components/      # reusable components
│   │   ├── common/
│   │   ├── post/
│   │   ├── chat/
│   │   └── ui/
│   ├── layouts/
│   ├── pages/
│   ├── hooks/
│   ├── services/        # gọi API
│   ├── store/           # Zustand stores
│   ├── theme/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
│
├── public/
├── vite.config.ts
└── package.json
```

---

## 3. Theme & màu sắc (BẮT BUỘC THỐNG NHẤT)

File: `src/theme/theme.ts`

```ts
export const theme = {
  colors: {
    primary: "#1877F2",     // Facebook Blue
    background: "#F0F2F5",
    text: "#050505",
    border: "#CED0D4",
    success: "#42B72A",
    danger: "#E41E3F"
  }
};
```

> ❗ Tất cả UI **phải dùng theme**, không hard-code màu.

---

## 4. Các chức năng frontend & API tương ứng

### 🔐 Authentication

**Chức năng**

* Đăng ký
* Đăng nhập
* Refresh token
* Logout

**API sử dụng**

```http
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh-token
POST /api/v1/auth/logout
```

**Luồng hoạt động**

1. User nhập email/password
2. Gửi request → backend
3. Nhận access token
4. Lưu token trong memory
5. Tự refresh khi token hết hạn

---

### 👤 User Profile

**Chức năng**

* Xem hồ sơ
* Cập nhật thông tin
* Trạng thái hiện tại

**API**

```http
GET   /api/v1/users/me
GET   /api/v1/users/{userId}
PUT   /api/v1/users/me
PATCH /api/v1/users/status
```

---

### 📰 Post (Feed)

**Chức năng**

* Tạo bài viết
* Xem feed
* Xóa bài viết

**API**

```http
POST   /api/v1/posts
GET    /api/v1/posts/feed
GET    /api/v1/posts/{postId}
DELETE /api/v1/posts/{postId}
```

---

### ❤️ Like / 💬 Comment / 🔁 Share

**API**

```http
POST   /api/v1/posts/{postId}/like
DELETE /api/v1/posts/{postId}/like

POST   /api/v1/posts/{postId}/comments
GET    /api/v1/posts/{postId}/comments

POST   /api/v1/posts/{postId}/share
```

---

### 👥 Friend System

**Chức năng**

* Gửi lời mời
* Chấp nhận / từ chối
* Hủy kết bạn

**API**

```http
POST   /api/v1/friends/request/{userId}
POST   /api/v1/friends/accept/{requestId}
POST   /api/v1/friends/reject/{requestId}
DELETE /api/v1/friends/{userId}
GET    /api/v1/friends/list
GET    /api/v1/friends/requests
```

---

### 💬 Chat Realtime

**Công nghệ**

* SignalR / WebSocket

**Hub**

```text
/chatHub
```

**Event**

```text
sendMessage
receiveMessage
typing
onlineStatus
```

---

### 🔔 Notification

**API**

```http
GET   /api/v1/notifications
PATCH /api/v1/notifications/{id}/read
```

---

### 🎥 Reels (Short Video)

**API**

```http
POST /api/v1/reels
GET  /api/v1/reels/feed
POST /api/v1/reels/{id}/like
```

---

### 👨‍👩‍👧‍👦 Group

```http
POST /api/v1/groups
GET  /api/v1/groups/{id}
POST /api/v1/groups/{id}/join
POST /api/v1/groups/{id}/post
```

---

### 🔍 Search

```http
GET /api/v1/search?q=keyword&type=post,user,group
```

---

## 5. Chạy frontend local

```bash
cd frontend
npm install
npm run dev
```

Truy cập:
👉 `http://localhost:5173`

---

# ⚙️ BACKEND

## 1. Công nghệ sử dụng

* ASP.NET Core Web API
* C#
* Entity Framework Core
* Dapper
* SignalR
* JWT Authentication
* FluentValidation
* PostgreSQL
* Redis (cache + realtime)

---

## 2. Cấu trúc backend

```text
backend/
├── ApiGateway/
├── services/
│   ├── AuthService/
│   ├── UserService/
│   ├── PostService/
│   ├── ChatService/
│   ├── NotificationService/
│   └── MediaService/
│
├── SharedKernel/
├── docker/
└── docker-compose.yml
```

---

## 3. Chạy backend local

```bash
cd backend
dotnet restore
dotnet run
```

Backend chạy tại:
👉 `http://localhost:5000`

---

## 4. Quy ước API backend

* Prefix: `/api/v1`
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

# 🚀 DEPLOYMENT

## 1. Build frontend

```bash
cd frontend
npm run build
```

---

## 2. Docker Compose

```bash
docker-compose up -d --build
```

Cách Vào thẳng container:
```bash
docker exec -it fb_postgres psql -U fb_admin -d facebook_clone
```
Nếu dùng tool:
```
Host: localhost
Port: 5432
Database: facebook_clone
Username: fb_admin
Password: fb_password
```

Bao gồm:

* Frontend (Nginx)
* Backend services
* PostgreSQL
* Redis

---

## 3. Production lưu ý

* Dùng HTTPS
* Reverse proxy bằng Nginx
* Bật rate limiting
* Bật logging
* Backup database

---
