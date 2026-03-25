# BẢNG CÔNG VIỆC DỰ ÁN FACEBOOK_CLONE
**Cập nhật lần cuối:** 2026-03-25 13:45  
**Trạng thái tổng thể:** ✅ PHASE 1 HOÀN TẤT | ⏳ PHASE 2 READY

---

## 📋 SƠ ĐỒ PHỤ THUỘC

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  POST-MGMT    FRIENDSHIPS    SEARCH    SETTINGS            │
│       │             │           │          │               │
│       └─────────────┴───────────┼──────────┘               │
│                                 │                           │
│                            MESSAGING                        │
│                              (Phase 2)                      │
│                                 │                           │
│                          NOTIFICATIONS                      │
│                           (Phase 3)                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Ghi chú:
- Phase 1 (Parallel): POST-MGMT, FRIENDSHIPS, SEARCH, SETTINGS
  - Frontend developers: làm POST-MGMT + SEARCH
  - Backend developers: làm FRIENDSHIPS backend + SEARCH backend
- Phase 2: MESSAGING (phụ thuộc vào user data từ FRIENDSHIPS)
- Phase 3: NOTIFICATIONS (hoàn thiện hệ thống)
```

---
## 📅 NHẬT KÝ THAY ĐỔI

**PHASE 1 - HOÀN TẤT (2026-03-25 13:45)**

**BACKEND TASKS - ✅ HOÀN TẤT:**
- [x] POST-001-BE-A — Tạo DTO cho Update Post request | File: `src/FacebookClone.Application/DTOs/UpdatePostRequest.cs`
- [x] POST-001-BE-B — Thêm endpoint PUT /api/posts/{id} | File: `src/FacebookClone.API/Controllers/PostsController.cs` dòng 45-58
- [x] POST-001-BE-C — Thêm endpoint DELETE /api/posts/{id} | File: `src/FacebookClone.API/Controllers/PostsController.cs` dòng 60-68
- [x] POST-001-BE-D — Implement PostService.UpdatePost() | File: `src/FacebookClone.API/Services/PostService.cs` dòng 120-155
- [x] POST-001-BE-E — Implement PostService.DeletePost() | File: `src/FacebookClone.API/Services/PostService.cs` dòng 157-185
- [x] POST-001-BE-F — Thêm middleware authorization | File: `src/FacebookClone.API/Middlewares/AuthorizationMiddleware.cs` dòng 1-50
- [x] FREN-001-BE-A — Tạo Friendship entity | File: `src/FacebookClone.Domain/Entities/Friendship.cs` dòng 1-30 & `AppDbContext.cs` dòng 45-50
- [x] FREN-001-BE-E — Migration + DB sync | Thực thi: `dotnet ef migrations add AddFriendship` & sync-db
- [x] SRCH-001-BE-B — Tạo endpoint GET /api/search/posts | File: `src/FacebookClone.API/Controllers/SearchController.cs` dòng 32-60
- [x] SRCH-001-BE-C — Implement search service | File: `src/FacebookClone.API/Services/SearchService.cs`
- [x] SETT-001-BE-A — Thêm fields vào User entity | File: `src/FacebookClone.Domain/Entities/User.cs` dòng 25-35
- [x] SETT-001-BE-B — Tạo DTO cho Update User | File: `src/FacebookClone.Application/DTOs/UpdateUserDTOs.cs`
- [x] SETT-001-BE-C — Thêm endpoints trong UserController | File: `src/FacebookClone.API/Controllers/UserController.cs` dòng 80-120
- [x] SETT-001-BE-D — Implement UserService methods | File: `src/FacebookClone.API/Services/UserService.cs` dòng 150-220
- [x] SETT-001-BE-E — Migration + DB sync | Thực thi: `dotnet ef migrations add UpdateUserSettings` & sync-db

**FRONTEND TASKS - ✅ HOÀN TẤT:**
- [x] POST-001-FE-A — Thêm modal "Edit Post" | File: `src/components/post/PostItem.jsx` dòng 50-120
- [x] POST-001-FE-B — Thêm modal "Delete Post" | File: `src/components/post/PostItem.jsx` dòng 122-160
- [x] POST-001-FE-C — Validation trong Edit modal | File: `src/components/post/PostItem.jsx` dòng 95-105
- [x] POST-001-FE-E — Hook API calls vào modals | File: `src/components/post/PostItem.jsx` dòng 130-155
- [x] POST-001-FE-F — Permission check UI | File: `src/components/post/PostItem.jsx` dòng 35-45
- [x] FREN-001-FE-A — Component "Add Friend Button" | File: `src/components/AddFriendButton.jsx` (tạo mới)
- [x] FREN-001-FE-B — Component "Friend List" | File: `src/components/FriendList.jsx` (tạo mới)
- [x] FREN-001-FE-C — API service functions | File: `src/services/friendshipService.js` (tạo mới)
- [x] FREN-001-FE-D — Hook API calls vào Button | File: `src/components/AddFriendButton.jsx` dòng 30-70
- [x] FREN-001-FE-E — Notifications page cho friend requests | File: `src/pages/Notifications/index.jsx` (tạo mới)
- [x] SRCH-001-FE-C — API service functions | File: `src/services/postService.js` + `userService.js`
- [x] SRCH-001-FE-D — Hook SearchBar vào navigation | File: `src/components/Layout/MainLayout.jsx` dòng 20-35
- [x] SETT-001-FE-A — Settings page với tabs | File: `src/pages/Settings/SettingsPage.jsx` (tạo mới)
- [x] SETT-001-FE-C — Privacy settings tab | File: `src/pages/Settings/SettingsPage.jsx` dòng 102-140
- [x] SETT-001-FE-D — Preferences tab | File: `src/pages/Settings/SettingsPage.jsx` dòng 142-180
- [x] SETT-001-FE-E — API service functions | File: `src/services/userService.js` dòng 1-80

---
## 🔴 PHASE 1: CÔNG VIỆC CHÍNH (SONG SONG)

### TASK-001 | POST-MGMT | Sửa/Xóa Bài Post
**Mô tả:** Thêm chức năng để user có thể sửa/xóa bài post của họ (tương tự Facebook)  
**Độ ưu tiên:** CAO  
**File liên quan:**  
- Frontend: `src/components/post/PostItem.jsx`, `src/components/post/MediaViewerModal.jsx`
- Backend: `Controllers/PostsController.cs`, `Services/`, `Entities/`, `Repositories/`

**Prompt cho Execution Agent (Frontend):**
Bạn là Execution Agent chuyên về UI/Frontend.

Nhiệm vụ: Thực thi TASK-001 POST-MGMT - các subtask frontend liên quan đến sửa/xóa post.

Quy trình:
1. Đọc file `agent_workspace.md`, tìm các subtask của TASK-001 có tag [FE]
3. Sau mỗi subtask xong, báo cáo: subtask nào vừa xong, đã thay đổi gì, ở đâu
4. Manager sẽ tick [x] vào file
5. Không tự sửa file `agent_workspace.md`
6. Bắt đầu bằng cách đọc file và xác nhận task
```
**Prompt cho Execution Agent (Backend):**
```
Bạn là Execution Agent chuyên về Logic/Backend (.NET C#).

Nhiệm vụ: Thực thi TASK-001 POST-MGMT - các subtask backend liên quan.
Quy trình:
1. Đọc file `agent_workspace.md`, tìm các subtask của TASK-001 có tag [BE]
2. Xử lý từng subtask backend theo thứ tự
3. Sau mỗi subtask xong, báo cáo chính xác: file nào, dòng nào, thay đổi gì
4. Không tự sửa file `agent_workspace.md`
```

**Subtask Frontend:**

- [x] **POST-001-FE-A** — Thêm modal "Edit Post" trong PostItem.jsx
  - Hiển thị modal khi click button "Edit"
  - Form có các field: content, media (nếu có)

- [x] **POST-001-FE-B** — Thêm modal "Delete Post" xác nhận
  - Hiển thị modal xác nhận trước khi xóa
  - Buttons: Delete, Cancel
  - **File:** `src/components/post/PostItem.jsx`

- [x] **POST-001-FE-C** — Thêm validation trong Edit Post modal
  - Hiển thị error message nếu invalid
  - **File:** `src/components/post/PostItem.jsx`

- [x] **POST-001-FE-D** — Tạo API service function updatePost() + deletePost()
  - `postService.updatePost(postId, { content, media })`
  - Handle error responses
  - **File:** `src/services/postService.js`

- [x] **POST-001-FE-E** — Hook API calls vào Edit/Delete modals
  - Call deletePost() khi click Confirm Delete
  - Show loading state
  - Show success/error toast
  - Refresh post list sau khi xong

- [x] **POST-001-FE-F** — Thêm permission check UI
  - Chỉ hiển thị "Edit/Delete" button nếu post.userId === currentUser.id
  - Lấy currentUser từ AuthContext
  - **File:** `src/components/post/PostItem.jsx`


- [x] **POST-001-BE-A** — Tạo DTO cho Update Post request
  - `UpdatePostRequest { content, media }`
  - Validation: content không được null/empty
  - **File:** `src/FacebookClone.Application/DTOs/` (tạo file mới)
- [x] **POST-001-BE-B** — Thêm endpoint PUT /api/posts/{id} trong PostsController
  - Nhận UpdatePostRequest
  - Call PostService.UpdatePost(postId, request)
  - Return updated post hoặc error

- [x] **POST-001-BE-C** — Thêm endpoint DELETE /api/posts/{id} trong PostsController
  - Call PostService.DeletePost(postId)
  - Return success/error response
  - **File:** `src/FacebookClone.API/Controllers/PostsController.cs`
- [x] **POST-001-BE-D** — Implement PostService.UpdatePost()
  - Kiểm tra post có tồn tại không
  - Kiểm tra user có phải chủ post không (Authorization)
  - Update content, media
  - Commit transaction
  - Return updated post
  - **File:** `src/FacebookClone.API/Services/` (hoặc Application layer)

  - Kiểm tra post có tồn tại không
  - Kiểm tra user có phải chủ post không (Authorization)
  - Xóa post khỏi DB
  - Ghi audit log
  - Commit transaction
  - **File:** `src/FacebookClone.API/Services/` (hoặc Application layer)

  - Nếu không, trả về 403 Forbidden
  - **File:** `src/FacebookClone.API/Middlewares/` (hoặc attribute filter)


### TASK-002 | FRIENDSHIPS | Quản Lý Bạn Bè
**Mô tả:** Chức năng add bạn, xóa bạn, danh sách bạn, accept/reject friend request  
**Độ ưu tiên:** CAO  
**File liên quan:**  
- Frontend: `src/components/`, `src/pages/Profile/`
- Backend: `Controllers/FriendshipsController.cs`, `Entities/Friendship.cs`, `Repositories/`


- [x] **FREN-001-FE-A** — Tạo component "Add Friend Button" cho Profile page
  - Button hiển thị: "Add Friend" / "Friends" / "Cancel Request" tùy trạng thái
  - Click gửi friend request

- [x] **FREN-001-FE-B** — Tạo component "Friend List" hiển thị danh sách bạn
  - Paginated list
  - Nút xóa bạn cho từng friend

- [x] **FREN-001-FE-C** — Tạo API service functions trong friendshipService
  - `sendFriendRequest(userId)`
  - `acceptFriendRequest(requestId)`
  - `removeFriend(friendId)`
  - `getFriendList(userId, page, limit)`
  - `getFriendRequests(page, limit)`
  - **File:** `src/services/friendshipService.js`

- [x] **FREN-001-FE-D** — Hook API calls vào Add Friend Button
  - Handle success/error toast
  - Refresh button state sau khi request sent
  - **File:** `src/components/` (file tạo ở FE-A)

  - Hiển thị danh sách pending friend requests
  - Buttons: Accept, Reject cho từng request
  - **File:** `src/pages/Notifications/` (tạo file mới)

**Subtask Backend:**
- [x] **FREN-001-BE-A** — Tạo Friendship entity + DbContext mapping
  - Properties: Id, FromUserId, ToUserId, Status (Pending/Accepted), CreatedAt
  - Indices: (FromUserId, ToUserId), Status
  - **File:** `src/FacebookClone.Domain/Entities/Friendship.cs` & `DbContext.cs`
- [x] **FREN-001-BE-B** — Tạo FriendshipRepository với CRUD methods
  - `SendRequest(fromId, toId)`
  - `AcceptRequest(requestId)`
  - `RejectRequest(requestId)`
  - `GetFriendList(userId, page, limit)`
  - `GetPendingRequests(userId, page, limit)`
  - **File:** `src/FacebookClone.Infrastructure/Repositories/FriendshipRepository.cs`

  - Kiểm tra friend request đã tồn tại chưa trước khi gửi
  - Kiểm tra không tự send request cho chính mình
  - Transaction handling
  - Audit log

- [x] **FREN-001-BE-D** — Tạo endpoints trong FriendshipsController
  - POST /api/friendships/request (send request)
  - PUT /api/friendships/request/{id}/accept (accept)
  - PUT /api/friendships/request/{id}/reject (reject)
  - DELETE /api/friendships/{friendId} (remove friend)
  - GET /api/friendships/list (get friend list)

- [x] **FREN-001-BE-E** — Migration + DB sync
  - Tạo migration cho Friendship table
  - **File:** `src/FacebookClone.Infrastructure/Migrations/`

---

**Mô tả:** Tìm kiếm users, posts  
**Độ ưu tiên:** TRUNG BÌNH  
**Điều kiện bắt đầu:** Không có  
**File liên quan:**  
- Frontend: `src/components/`, `src/pages/Search/`

**Subtask Frontend:**

- [x] **SRCH-001-FE-A** — Tạo Search Bar component
  - Real-time search (debounced)
  - Dropdown hiển thị suggestions
  - **File:** `src/components/common/SearchBar.jsx`

  - Tabs: Users, Posts
  - Pagination cho mỗi tab
  - Display user cards / post cards
  - **File:** `src/pages/Search/SearchResultsPage.jsx`

- [x] **SRCH-001-FE-C** — Tạo API service functions
  - `searchPosts(query, page, limit)`
  - **File:** `src/services/postService.js` + `userService.js`

- [x] **SRCH-001-FE-D** — Hook SearchBar vào navigation
  - Display SearchResultsPage
  - **File:** `src/components/Layout/MainLayout.jsx`

**Subtask Backend:**

  - Query parameter: q (search term), page, limit
  - Return: list của users (Id, Name, Avatar)
  - Pagination metadata
  - **File:** `src/FacebookClone.API/Controllers/` (tạo SearchController hoặc thêm vào UserController)
- [x] **SRCH-001-BE-B** — Tạo endpoint GET /api/search/posts
  - Query parameter: q, page, limit
  - Search in post content
  - Return: list posts với user info
  - **File:** `src/FacebookClone.API/Controllers/` (Post search endpoint)

- [x] **SRCH-001-BE-C** — Implement search service với LIKE/full-text search
  - Optimize query với index nếu cần
  - Return paginated results

---

### TASK-004 | SETTINGS | Cài Đặt Người Dùng
**Độ ưu tiên:** THẤP  
**Điều kiện bắt đầu:** Không có  
**File liên quan:**  
- Frontend: `src/pages/Settings/`
- Backend: `Controllers/UserController.cs`, `Services/`

**Subtask Frontend:**

- [x] **SETT-001-FE-A** — Tạo Settings page với tabs

- [x] **SETT-001-FE-B** — Implement Profile settings tab
  - Save button
  - **File:** `src/pages/Settings/SettingsPage.jsx`
- [x] **SETT-001-FE-C** — Implement Privacy settings tab
  - Toggle: "Private Profile", "Hide Friends List", "Only Friends Can Message"
- [x] **SETT-001-FE-D** — Implement Preferences tab
  - Toggle: "Email Notifications", "Show Online Status"
  - Dropdown: Language, Theme
  - Save button
  - **File:** `src/pages/Settings/SettingsPage.jsx`

- [x] **SETT-001-FE-E** — Tạo API service functions
  - `updateProfile(data)`
  - **File:** `src/services/userService.js`


- [x] **SETT-001-BE-A** — Thêm fields vào User entity
  - emailNotifications, showOnlineStatus, language, theme
  - **File:** `src/FacebookClone.Domain/Entities/User.cs`
  - **File:** `src/FacebookClone.Application/DTOs/UserDTOs.cs`

  - PUT /api/users/profile
  - PUT /api/users/privacy
  - PUT /api/users/preferences
  - Validation + audit log
  - **File:** `src/FacebookClone.API/Services/UserService.cs`

- [x] **SETT-001-BE-E** — Migration + DB sync
  - Tạo migration
  - Run sync-db
  - **File:** `src/FacebookClone.Infrastructure/Migrations/`

---

## 🟡 PHASE 2: MESSAGING (phụ thuộc Phase 1)

### TASK-005 | MESSAGING | Chat Real-Time
**Mô tả:** Tính năng nhắn tin/chat giữa users, real-time updates qua SignalR  
**Độ ưu tiên:** CAO  
**Điều kiện bắt đầu:** ✅ TASK-002 (Friendships) đã hoàn tất  
**File liên quan:**  
- Frontend: `src/components/Chat/`, `src/pages/Messages/`
- Backend: `Hubs/ChatHub.cs`, `Controllers/ChatController.cs`, `Entities/Message.cs`

---

**Prompt cho Execution Agent (Frontend - Phase 2):**
```
Bạn là Execution Agent chuyên về Frontend/UI - PHASE 2.

Nhiệm vụ: Thực thi TASK-005 MESSAGING - frontend chat interface.

Quy trình:
1. Đọc file `agent_workspace.md`, tìm TASK-005 phần Frontend subtasks
2. Xử lý từng subtask theo thứ tự (MSG-P2-FE-A → F)
3. Sau mỗi subtask xong, báo cáo: subtask nào, file nào, thay đổi gì
4. ĐẶC BIỆT: Verify SignalR client integration (xem xét ReconnectionPolicy, auto-reconnect)
5. Không tự sửa file `agent_workspace.md`
6. Bắt đầu bằng cách đọc file và xác nhận

Lưu ý: dùng existing shared UI components từ `src/components/common/` nếu có
```

**Prompt cho Execution Agent (Backend - Phase 2):**
```
Bạn là Execution Agent chuyên về Backend (.NET C#) - PHASE 2.

Nhiệm vụ: Thực thi TASK-005 MESSAGING - backend chat API + SignalR hub.

Quy trình:
1. Đọc file `agent_workspace.md`, tìm TASK-005 phần Backend subtasks
2. Xử lý từng subtask theo thứ tự (MSG-P2-BE-A → E)
3. Báo cáo chính xác: file, dòng code, thay đổi gì
4. ĐẶC BIỆT: Xử lý race condition khi 2 user chat cùng lúc (dùng transaction)
5. Dùng correlationId cho mỗi message
6. Ghi audit log cho mỗi message (ai gửi, cái gì, khi nào)
7. Bắt đầu bằng cách đọc file và xác nhận
```

**Subtask Frontend – MESSAGING UI:**

- [ ] **MSG-P2-FE-A** — Tạo ChatListPage hiển thị danh sách conversations
  - Danh sách users (từ friendlist) có badge unread count
  - Search & filter conversations
  - Click vào user → open ChatWindow
  - **File:** `src/pages/Messages/ChatListPage.jsx` ✅ CREATED & IMPLEMENTED
  - **Changes:** Friends list from friendshipService, search/filter, conversation route navigation
  - **Gap còn lại:** chưa render unread count badge theo đúng mô tả task

- [x] **MSG-P2-FE-B** — Tạo ChatWindow component hiển thị thread messages
  - Header: user avatar, name, status online
  - Message list: auto-scroll to bottom khi có message mới
  - Separate styles cho own message vs other message
  - Timestamp hiển thị
  - **File:** `src/components/Chat/ChatWindow.jsx` ✅ CREATED & IMPLEMENTED
  - **Changes:** Auto-scroll with `useRef(messagesEndRef)`, date separators with `date-fns`, online status indicator, message styling

- [x] **MSG-P2-FE-C** — Tạo MessageInput component + send message
  - Input field + Send button
  - Max length validation (1000 chars?)
  - Disable send nếu konten rỗng
  - Loading state trong button khi sending
  - Show error toast nếu send failed
  - **File:** `src/components/Chat/MessageInput.jsx` ✅ CREATED & IMPLEMENTED
  - **Changes:** MAX_LENGTH=1000, debounce typing (300ms), loading spinner, error toast handling

- [x] **MSG-P2-FE-D** — Integrate SignalR client javaScript lib
  - Import `@microsoft/signalr`
  - Create connection → `new HubConnectionBuilder().withUrl(...).withAutomaticReconnect([0, 2000, 5000]).build()`
  - Start/stop connection lifecycle
  - Handle reconnect logic
  - **File:** `src/services/chatService.js` ✅ CREATED & IMPLEMENTED
  - **Changes:** HubConnectionBuilder with auto-reconnect [0, 2000, 5000], access token factory, connection state management

- [x] **MSG-P2-FE-E** — Hook SignalR events vào ChatWindow
  - Listen event: `ReceiveMessage(messagerId, message)`
  - Listen event: `UserOnline(userId)` / `UserOffline(userId)` → update UI status
  - Listen event: `TypingIndicator(userId)`
  - Show notification toast khi có message mới từ friend khác
  - **File:** `src/components/Chat/ChatWindow.jsx` LINES 101-150 ✅ IMPLEMENTED
  - **Changes:** handleReceiveMessage, handleUserOnline, handleUserOffline, handleTyping with event listeners & cleanup

- [x] **MSG-P2-FE-F** — Thêm "Typing Indicator"
  - Khi user typing → emit `UserTyping(receiverId)` event
  - UI hiển thị "[User] is typing..." khi nhận event
  - Debounce typing emit (300ms)
  - **File:** `src/components/Chat/ChatWindow.jsx` + `src/components/Chat/MessageInput.jsx` ✅ IMPLEMENTED
  - **Changes:** Typing indicator UI with animated dots, 3s timeout, debounced emit in MessageInput

**Subtask Backend – MESSAGING API:**

- [x] **MSG-P2-BE-A** — Tạo Message entity + DbContext mapping
  - Properties: Id, FromUserId, ToUserId, Content, CreatedAt, IsRead
  - Indices: (FromUserId, ToUserId), CreatedAt
  - Soft delete: không xóa message, chỉ mark IsDeleted
  - **File:** `src/FacebookClone.Domain/Entities/Message.cs` & add DbSet<Message> to AppDbContext.cs

- [x] **MSG-P2-BE-B** — Tạo MessageRepository with pagination
  - `GetConversation(userId, friendId, page, limit)` → list messages between 2 users
  - `GetUnreadCount(userId)` → count unread messages cho user
  - `MarkAsRead(messageIds)` → mark list messages as read
  - `SendMessage(fromUserId, toUserId, content)` → insert message
  - Transaction: đảm bảo atomicity
  - **File:** `src/FacebookClone.Infrastructure/Repositories/MessageRepository.cs` (tạo mới)

- [x] **MSG-P2-BE-C** — Tạo MessageService với business logic
  - Kiểm tra 2 users có phải friend không (throw error nếu không)
  - Kiểm tra content không empty (throw error)
  - Lưu message → Database
  - Send notification (sau) nếu receiver offline
  - Return message DTO (Id, FromUserId, ToUserId, Content, CreatedAt)
  - Ghi audit log
  - **File:** `src/FacebookClone.API/Services/MessageService.cs` (tạo mới)

- [x] **MSG-P2-BE-D** — Implement ChatHub (SignalR) methods
  - `OnConnected()` → mark user online, join group (userId)
  - `OnDisconnected()` → mark user offline
  - `SendMessage(toUserId, content)` → validate, save, broadcast to receiver
  - `TypingNotification(receiverId)` → broadcast "user typing" event
  - `MarkMessagesAsRead(messageIds)`
  - Error handling: try-catch, log error, send error message back to client
  - **File:** `src/FacebookClone.API/Hubs/ChatHub.cs` (update file có sẵn)

- [x] **MSG-P2-BE-E** — Tạo endpoints GET messages + conversation list
  - `GET /api/messages/conversations` → list tất cả conversations (+ unread count)
  - `GET /api/messages/{userId}?page=1&limit=20` → get messages between current user & userId
  - `POST /api/messages/read` → mark messages as read (body: messageIds array)
  - Pagination metadata cho mỗi endpoint
  - Authorize: chỉ user có liên quan mới xem được
  - **File:** `src/FacebookClone.API/Controllers/ChatController.cs` (update file)

**Subtask – Database Migration:**

- [x] **MSG-P2-BE-F** — Migration + DB sync
  - `dotnet ef migrations add AddMessageEntity`
  - `dotnet user-secrets set "DbSync" "true"` → sync-db
  - Verify table Message được tạo trong database
  - **Thực thi:** Terminal

---

---

## 🟢 PHASE 3: NOTIFICATIONS (cuối cùng)

### TASK-006 | NOTIFICATIONS | Thông Báo Hệ Thống
**Mô tả:** Real-time notifications cho friend requests, post interactions (like, comment), messages  
**Độ ưu tiên:** CAO  
**Điều kiện bắt đầu:** Bắt buộc sau PHASE 2 (ChatHub + SignalR ready)  
**File liên quan:**  
- Frontend: `src/components/Notifications/`, `src/services/notificationService.js`
- Backend: `Hubs/NotificationHub.cs`, `Controllers/NotificationsController.cs`, `Services/NotificationHubService.cs`

---

**Subtask Frontend:**

- [ ] **NOTIF-P3-FE-A** — Tạo Notification Bell Icon + Badge
  - Hiển thị icon trong header/navbar
  - Badge showing unread count (số lượng notifications chưa đọc)
  - Click icon → toggle dropdown panel
  - Unread badge auto-update khi nhận notification
  - **File:** `src/components/Notifications/NotificationBell.jsx` (tạo mới)
  - **Logic:**
    - Fetch unread count từ API: `GET /api/v1/notifications/unread-count`
    - Real-time update qua SignalR: listen `NewNotification` event
    - Badge số tự động tăng khi có notification mới

- [ ] **NOTIF-P3-FE-B** — Tạo Notification Dropdown Panel
  - Danh sách notifications (max 10, pagination)
  - Scroll để load more (infinite scroll)
  - Hiển thị: avatar, sender name, action (liked your post / commented / sent friend request), time ago
  - Mark as read: hover/click notification
  - Delete notification: click icon
  - Click notification → navigate to related post/friend profile
  - Empty state khi không có notifications
  - **File:** `src/components/Notifications/NotificationPanel.jsx` (tạo mới)
  - **Data:**
    ```
    {
      id, type (post_like|post_comment|friend_request|message),
      senderId, senderName, senderAvatar,
      targetId (postId hoặc userId),
      targetType (post|user),
      message, createdAt, isRead
    }
    ```

- [ ] **NOTIF-P3-FE-C** — Hook SignalR events cho Notifications
  - Listen `NewNotification(notification)` → thêm vào list, tăng badge
  - Listen `NotificationRead(notificationId)` → update isRead
  - Listen `NotificationDeleted(notificationId)` → remove from list
  - **File:** `src/components/Notifications/NotificationPanel.jsx` + setup trong `App.jsx` App-level hook
  - **Benefits:** Real-time updates, không cần refresh page

- [ ] **NOTIF-P3-FE-D** — Tạo notificationService.js
  - REST API wrappers:
    - `getNotifications(pageNumber, pageSize)` → GET /api/v1/notifications?pageNumber=1&pageSize=10
    - `getUnreadCount()` → GET /api/v1/notifications/unread-count
    - `markAsRead(notificationId)` → POST /api/v1/notifications/{id}/read
    - `deleteNotification(notificationId)` → DELETE /api/v1/notifications/{id}
    - `markAllAsRead()` → POST /api/v1/notifications/all/read
  - SignalR listeners (xem NOTIF-P3-FE-C để biết events)
  - **File:** `src/services/notificationService.js` (tạo mới)

---

**Subtask Backend:**

- [x] **NOTIF-P3-BE-A** — Tạo Notification Entity + DbContext
  - Entity `Notification`:
    ```csharp
    public Guid Id { get; set; }
    public Guid UserId { get; set; } // Người nhận notification
    public Guid SenderId { get; set; } // Người gửi action (like, comment, friend request)
    public NotificationType Type { get; set; } // Enum: PostLike, PostComment, FriendRequest, Message
    public Guid? TargetId { get; set; } // postId hoặc userId (tùy type)
    public string Message { get; set; } // "User X liked your post"
    public bool IsRead { get; set; } = false
    public DateTime CreatedAt { get; set; }
    public bool IsDeleted { get; set; } // soft delete
    
    public User User { get; set; } // Navigation
    public User Sender { get; set; } // Navigation
    ```
  - Enum `NotificationType`: PostLike = 0, PostComment = 1, FriendRequest = 2, Message = 3, FriendAccepted = 4
  - Add to AppDbContext: `DbSet<Notification> Notifications`
  - Migration: `dotnet ef migrations add AddNotificationEntity`
  - Indices: (UserId, CreatedAt), (UserId, IsRead), (SenderId)
  - **File:** `src/FacebookClone.Domain/Entities/Notification.cs` (tạo mới)

- [x] **NOTIF-P3-BE-B** — Tạo NotificationRepository + Service
  - **Repository methods:**
    - `GetNotificationsAsync(userId, pageNumber, pageSize)` → pagination, order by CreatedAt DESC
    - `GetUnreadCountAsync(userId)` → count where IsRead = false
    - `MarkAsReadAsync(notificationId)` → SET IsRead = true
    - `MarkAllAsReadAsync(userId)` → SET IsRead = true WHERE UserId = userId
    - `DeleteNotificationAsync(notificationId)` → soft delete (SET IsDeleted = true)
    - `CreateNotificationAsync(notification)` → insert + transaction
  - **File:** `src/FacebookClone.Infrastructure/Repositories/NotificationRepository.cs` (tạo mới)
  
  - **Service methods (NotificationService):**
    - `CreateNotificationAsync(userId, senderId, type, targetId, message)` → validation, save, return DTO
    - `GetUserNotificationsAsync(userId, pageNumber, pageSize)` → repository call + mapping to DTO
    - `GetUnreadCountAsync(userId)` → repository call
    - `MarkAsReadAsync(userId, notificationId)` → authorize (chỉ userId mới được mark), call repo
    - `MarkAllAsReadAsync(userId)` → call repo
    - `DeleteNotificationAsync(userId, notificationId)` → authorize, soft delete
    - Audit logging: ghi lại ai xem/xóa/read notifications
  - **File:** `src/FacebookClone.API/Services/NotificationService.cs` (tạo mới)

- [x] **NOTIF-P3-BE-C** — Implement NotificationHub (SignalR)
  - Methods:
    - `OnConnectedAsync()` → join group `Notifications-{UserId}`, mark online
    - `OnDisconnectedAsync()` → leave group
    - `MarkNotificationAsRead(notificationId)` → call service, emit to sender if needed
    - `DeleteNotification(notificationId)` → call service, confirm to client
  - Events broadcast:
    - `NewNotification(notification)` → send to user group "Notifications-{UserId}"
    - `BadgeUpdate(unreadCount)` → send to user
  - Error handling: try-catch, log, send error event
  - **File:** `src/FacebookClone.API/Hubs/NotificationHub.cs` (tạo mới)

- [x] **NOTIF-P3-BE-D** — Tạo NotificationsController
  - Endpoints:
    - `GET /api/v1/notifications?pageNumber=1&pageSize=10` → get user notifications (paginated)
    - `GET /api/v1/notifications/unread-count` → get unread count, set badge
    - `POST /api/v1/notifications/{id}/read` → mark single notification as read
    - `POST /api/v1/notifications/all/read` → mark all as read
    - `DELETE /api/v1/notifications/{id}` → soft delete notification
  - Response format: `{ success, data, pagination: {page, limit, total, totalPages} }`
  - Authorize: chỉ user chủ sở hữu mới được access
  - **File:** `src/FacebookClone.API/Controllers/NotificationsController.cs` (tạo mới)

- [x] **NOTIF-P3-BE-E** — Trigger Notifications từ Post/Friend Actions
  - **Post Like:** 
    - Khi POST /api/posts/{id}/like thành công → trigger: `CreateNotificationAsync(postOwnerId, currentUserId, PostLike, postId, "User X liked your post")`
    - Broadcast via NotificationHub tới postOwner
  - **Post Comment:**
    - Khi POST /api/posts/{postId}/comments thành công → trigger notification cho postOwner
    - Message: "User X commented on your post"
  - **Friend Request Accepted:**
    - Khi PUT /api/friendships/{requestId}/accept → trigger notification cho requester
    - Message: "User X accepted your friend request"
  - **Integration:** Update POST/PUT handlers trong Controllers để gọi NotificationService.CreateNotificationAsync()
  - Transaction: dùng transaction để đảm bảo notification tạo cùng với action
  - **Files:** PostsController.cs, FriendshipsController.cs (update)

---

**Subtask – Database Migration:**

- [x] **NOTIF-P3-BE-F** — Migration + DB sync
  - `dotnet ef migrations add AddNotificationEntity`
  - `dotnet ef database update`
  - Verify table `Notifications` được tạo với đúng schema
  - **Thực thi:** Terminal

---

**Integration Checklist (PHASE 3):**
- [ ] NotificationBell component rendered in Header/Navbar
- [ ] NotificationPanel dropdown integrated with NotificationBell
- [ ] SignalR events (NewNotification, BadgeUpdate, NotificationRead, NotificationDeleted) hooked in NotificationPanel
- [ ] notificationService.js fully implemented with API calls + SignalR listeners
- [x] PostsController updated to trigger notifications on like/comment
- [x] FriendshipsController updated to trigger notifications on accept
- [ ] ChatController/ChatHub can trigger message notification (optional - messages already have real-time via ChatHub)
- [x] Database migrations applied successfully
- [x] Audit logs record all notification actions
- [ ] CorrelationId propagated through notification creation flow
- [x] Error handling for notification failures (doesn't break post/friend operations)

---

## 🔵 TÓNG HỢP STATISTIC

| Phase | Tasks | Subtasks | Status |
|-------|-------|----------|--------|
| Phase 1 | 4 | 28 | ⏳ Ready |
| Phase 2 | 1 | 7 | ⏳ Waiting |
| Phase 3 | 1 | 5 | ⏳ Waiting |
| **Total** | **6** | **40** | - |

---

## 🚀 KẾ HOẠCH THỰC HIỆN

### Frontend Team (Execution Session 1)
```
Nhiệm vụ: Xử lý tất cả subtask [FE]

Phase 1 subtasks (song song):
- POST-001-FE-A đến POST-001-FE-F (6 subtasks) ~ 2-3 ngày
- FREN-001-FE-A đến FREN-001-FE-E (5 subtasks) ~ 2 ngày  
- SRCH-001-FE-A đến SRCH-001-FE-D (4 subtasks) ~ 1.5 ngày
- SETT-001-FE-A đến SETT-001-FE-E (5 subtasks) ~ 1.5 ngày

Tổng: ~7 ngày làm việc
```

### Backend Team (Execution Session 2)
```
Nhiệm vụ: Xử lý tất cả subtask [BE]

Phase 1 subtasks (song song):
- POST-001-BE-A đến POST-001-BE-F (6 subtasks) ~ 2-3 ngày
- FREN-001-BE-A đến FREN-001-BE-E (5 subtasks) ~ 2 ngày
- SRCH-001-BE-A đến SRCH-001-BE-C (3 subtasks) ~ 1 ngày
- SETT-001-BE-A đến SETT-001-BE-E (5 subtasks) ~ 1.5 ngày

Tổng: ~6.5 ngày làm việc
```

---

## ⚠️ GHI CHÚ QUAN TRỌNG

1. **Authorization Check bắt buộc:** Đảm bảo mọi operation có authorization (chỉ user chủ sở hữu mới được sửa/xóa)
2. **Audit Logging:** Ghi lại mọi thay đổi (update/delete post, friendship actions, settings changes)
3. **Transaction & Race Condition:** Dùng transaction cho multi-step operations (especially friendship + notification)
4. **API Response Format:** Tuân thủ `{ success: bool, message: string, data: any, pagination?: {...} }`
5. **Validation:** Input validation ở tầng controller, không để lọt xuống service
6. **SignalR Real-time:** Chuẩn bị cho Phase 2 - messaging sẽ dùng SignalR hub

---

## ✅ CHECKLIST TRƯỚC KHI BẮT ĐẦU

- [ ] Bạn đồng ý với 6 tasks chính?
- [ ] Bạn đồng ý với thứ tự phụ thuộc (Phase 1 → Phase 2 → Phase 3)?
- [ ] Có câu hỏi nào về subtask?
- [ ] Sẵn sàng chọn 2 Execution Sessions (Frontend + Backend) để bắt đầu?

---

# TIẾP THEO - PHASE 2: MESSAGING

**🚀 STATUS: SẴN SÀNG KHỞI ĐỘNG**

---

## CHỌN: Frontend Execution Agent (PHASE 2)

Dán prompt này vào chat riêng để bắt đầu PHASE 2 Frontend:

```
Bạn là Execution Agent chuyên về Frontend/UI - PHASE 2.

Nhiệm vụ: Thực thi TASK-005 MESSAGING.

Quy trình bắt buộc:
1. Mở file `c:\Code\Repository\Facebook_Clone\agent_workspace.md`
2. Tìm section "## 🟡 PHASE 2: MESSAGING (phụ thuộc Phase 1)"
3. Đọc tất cả Subtask Frontend từ MSG-P2-FE-A → MSG-P2-FE-F
4. Xử lý từng subtask theo thứ tự:
   - Đọc description + yêu cầu
   - Xác định file cần tạo/sửa
   - Implement code
   - Báo cáo: subtask nào vừa xong, file nào, thay đổi gì
5. Sau khi xong toàn bộ 6 subtask Frontend, gửi báo cáo tổng kết

Lưu ý quan trọng:
- Dùng existing shared components từ `src/components/common/` nếu có (button, input, modal, etc.)
- SignalR connection cần có: withAutomaticReconnect([0, 2000, 5000])
- Xử lý loading state, error handling, edge cases
- Không tự sửa file `agent_workspace.md` - Manager sẽ tick
- Lấy user info từ AuthContext (currentUser, currentUserId)
- Verify unread message count, online status, typing indicator

Bắt đầu bằng cách: Đọc file agent_workspace.md, tìm TASK-005, xác nhận task với tôi.
```

---

## CHỌN: Backend Execution Agent (PHASE 2)

Dán prompt này vào chat riêng để bắt đầu PHASE 2 Backend:

```
Bạn là Execution Agent chuyên về Logic/Backend (.NET C#) - PHASE 2.

Nhiệm vụ: Thực thi TASK-005 MESSAGING.

Quy trình bắt buộc:
1. Mở file `c:\Code\Repository\Facebook_Clone\agent_workspace.md`
2. Tìm section "## 🟡 PHASE 2: MESSAGING (phụ thuộc Phase 1)"
3. Đọc tất cả Subtask Backend từ MSG-P2-BE-A → MSG-P2-BE-F
4. Xử lý từng subtask theo thứ tự:
   - Đọc description + yêu cầu
   - Xác định file cần tạo/sửa
   - Implement code
   - Báo cáo chính xác: file nào, dòng nào, thay đổi gì
5. Sau khi xong toàn bộ 6 subtask Backend, gửi báo cáo tổng kết

Lưu ý quan trọng - BẮT BUỘC:
- **Transaction handling:** `using (var transaction = await _dbContext.Database.BeginTransactionAsync())`
  → Đảm bảo 2 users chat cùng lúc không bị race condition
- **Race Condition:** Check message đã send chưa trước khi send lại
- **Soft Delete:** Message entity có IsDeleted flag, không thực sự xóa
- **Audit Log:** Ghi log cho mỗi message: {fromUserId, toUserId, createdAt, correlationId}
- **Authorization:** Kiểm tra 2 users có phải friends không TRƯỚC khi cho phép chat
- **API Response:** Chuẩn { success: bool, message: string, data: any, pagination?: {...} }
- **SignalR Error Handling:** try-catch trong mỗi hub method, log error, send error response
- **CorrelationId:** Truyền qua từng message, use từ HttpContext

Chi tiết task:
- MSG-P2-BE-A: Entities/Message.cs + DbContext mapping (indices trên FromUserId, ToUserId)
- MSG-P2-BE-B: MessageRepository (getConversation, getUnreadCount, markAsRead, sendMessage)
- MSG-P2-BE-C: MessageService (validation, friendship check, audit log, message save)
- MSG-P2-BE-D: ChatHub (OnConnected, OnDisconnected, SendMessage, TypingNotification, MarkAsRead)
- MSG-P2-BE-E: ChatController endpoints + authorization checks
- MSG-P2-BE-F: Migration + DB sync

Bắt đầu bằng cách: Đọc file agent_workspace.md, tìm TASK-005, xác nhận task với tôi.
```

---

## ✅ CHECKLIST CÓ VẤN ĐỀ KHÔNG?

☑️ **Frontend Session sẽ implement:**
- Chat List page (danh sách conversations)
- Chat Window component (message thread)
- Message Input component (send message)
- SignalR client integration
- Typing indicator UI
- Online status indicator

✅ **Backend Session sẽ implement:**
- Message entity + DB mapping
- MessageRepository (pagination + query)
- MessageService (business logic)
- ChatHub (SignalR real-time)
- API endpoints (GET conversations, GET messages, POST read)
- DB migration

---

**Sẵn sàng khởi động PHASE 2 không?**

- Có vấn đề hay cần điều chỉnh prompt trước?
- Hay bắt đầu luôn?

---

# TIẾP THEO - PHASE 3: NOTIFICATIONS

**🚀 STATUS: SẴN SÀNG KHỞI ĐỘNG (SAU PHASE 2)**

---

## CHỌN: Frontend Execution Agent (PHASE 3)

Dán prompt này vào chat riêng để bắt đầu PHASE 3 Frontend:

```
Bạn là Execution Agent chuyên về Frontend/UI - PHASE 3 NOTIFICATIONS.

Nhiệm vụ: Thực thi TASK-006 NOTIFICATIONS (4 frontend subtasks).

Quy trình bắt buộc:
1. Mở file `c:\Code\Repository\Facebook_Clone\agent_workspace.md`
2. Tìm section "## 🟢 PHASE 3: NOTIFICATIONS" và subsection Frontend
3. Đọc tất cả Subtask Frontend từ NOTIF-P3-FE-A → NOTIF-P3-FE-D
4. Xử lý từng subtask theo thứ tự:
   - Đọc description + requirements + data structure
   - Xác định file cần tạo/sửa
   - Implement code with proper error handling & loading states
   - Báo cáo chính xác: subtask nào vừa xong, file nào, dòng nào, thay đổi gì
5. Sau khi hoàn thành NOTIF-P3-FE-A→D, gửi báo cáo tổng kết

Lưu ý quan trọng:
- **NOTIF-P3-FE-A:** NotificationBell.jsx trong Header/Navbar
  - Badge hiển thị số lượng unread notifications
  - Real-time update qua SignalR event: `NewNotification` → tăng badge
  - Click icon → toggle NotificationPanel dropdown
  
- **NOTIF-P3-FE-B:** NotificationPanel.jsx dropdown component
  - Danh sách notifications (max 10, pagination)
  - Hiển thị: avatar, sender name, action description, time ago
  - Click notification → navigate to related post/profile
  - Hover/Click → mark as read
  - Click delete icon → delete notification (soft delete)
  - Infinite scroll để load more
  - Empty state khi không có notifications
  
- **NOTIF-P3-FE-C:** Hook SignalR events vào NotificationPanel
  - Listen: `NewNotification(notification)` → add to list, update badge
  - Listen: `NotificationRead(notificationId)` → update isRead status
  - Listen: `NotificationDeleted(notificationId)` → remove from list
  - Setup cleanup functions trong useEffect
  
- **NOTIF-P3-FE-D:** notificationService.js (tạo mới)
  - REST API wrappers: getNotifications(), getUnreadCount(), markAsRead(), deleteNotification(), markAllAsRead()
  - SignalR event registration functions
  - Error handling & toast notifications

Dùng existing components:
- Button, Input, Avatar, Modal, Toast từ `src/components/common/`
- Lucide icons cho notification bell, delete, etc.
- React hooks: useState, useEffect, useCallback, useRef
- date-fns cho time ago formatting

Lấy user info từ AuthContext (currentUser, currentUserId).
Verify: SignalR connection đã start khi component mount.

Chi tiết file cần tạo/sửa:
- CREATE: `src/components/Notifications/NotificationBell.jsx`
- CREATE: `src/components/Notifications/NotificationPanel.jsx`
- CREATE: `src/components/Notifications/NotificationBell.css` & `NotificationPanel.css`
- CREATE: `src/services/notificationService.js`
- UPDATE: `src/components/common/Header.jsx` để render NotificationBell

Bắt đầu bằng cách: Đọc tất cả NOTIF-P3-FE subtasks, xác nhận với tôi.
```

---

## CHỌN: Backend Execution Agent (PHASE 3)

Dán prompt này vào chat riêng để bắt đầu PHASE 3 Backend:

```
Bạn là Execution Agent chuyên về Logic/Backend (.NET C#) - PHASE 3 NOTIFICATIONS.

Nhiệm vụ: Thực thi TASK-006 NOTIFICATIONS (6 backend subtasks).

Quy trình bắt buộc:
1. Mở file `c:\Code\Repository\Facebook_Clone\agent_workspace.md`
2. Tìm section "## 🟢 PHASE 3: NOTIFICATIONS" và subsection Backend
3. Đọc tất cả Subtask Backend từ NOTIF-P3-BE-A → NOTIF-P3-BE-F
4. Xử lý từng subtask theo thứ tự:
   - Đọc description + requirements + schema
   - Xác định file cần tạo/sửa
   - Implement code with proper error handling
   - Báo cáo chính xác: file nào, line numbers, thay đổi gì
5. Sau khi hoàn thành NOTIF-P3-BE-A→F, gửi báo cáo tổng kết

Chi tiết subtasks:

**NOTIF-P3-BE-A:** Notification Entity + DbContext
- Entities/Notification.cs (tạo mới)
  - Id (Guid PK), UserId (receiver), SenderId (action creator)
  - Type enum (PostLike=0, PostComment=1, FriendRequest=2, Message=3, FriendAccepted=4)
  - TargetId (postId hoặc userId), Message, IsRead, CreatedAt, IsDeleted
  - Foreign keys + navigation properties
- Migration: `dotnet ef migrations add AddNotificationEntity`
- Indices: (UserId, CreatedAt), (UserId, IsRead), (SenderId)

**NOTIF-P3-BE-B:** NotificationRepository + NotificationService
- Repository methods: GetNotificationsAsync(), GetUnreadCountAsync(), MarkAsReadAsync(), MarkAllAsReadAsync(), DeleteNotificationAsync(), CreateNotificationAsync()
- Service methods: Validation, authorization check (chỉ user chủ sở hữu mới access), audit logging, transaction support
- File: `src/FacebookClone.Infrastructure/Repositories/NotificationRepository.cs` (tạo)
- File: `src/FacebookClone.API/Services/NotificationService.cs` (tạo)

**NOTIF-P3-BE-C:** NotificationHub (SignalR)
- OnConnectedAsync(): join group "Notifications-{UserId}"
- OnDisconnectedAsync(): cleanup
- MarkNotificationAsRead(notificationId): service call + emit
- DeleteNotification(notificationId): service call + confirm
- Broadcast events: `NewNotification(notification)`, `BadgeUpdate(unreadCount)`
- Error handling: try-catch, logging, send error event
- File: `src/FacebookClone.API/Hubs/NotificationHub.cs` (tạo)

**NOTIF-P3-BE-D:** NotificationsController
- GET /api/v1/notifications?pageNumber=1&pageSize=10 (paginated, include unread count per notification)
- GET /api/v1/notifications/unread-count (badge count)
- POST /api/v1/notifications/{id}/read (mark single as read)
- POST /api/v1/notifications/all/read (mark all as read)
- DELETE /api/v1/notifications/{id} (soft delete)
- Response format: { success, data, pagination: {page, limit, total, totalPages} }
- Authorization: request.User.Id == userId trên URL
- File: `src/FacebookClone.API/Controllers/NotificationsController.cs` (tạo)

**NOTIF-P3-BE-E:** Trigger Notifications từ Actions
- **Post Like Trigger:** PostsController → POST /api/posts/{id}/like
  - Sau khi save like → call notificationService.CreateNotificationAsync(postOwnerId, currentUserId, PostLike, postId, "User X liked your post")
  - Broadcast via NotificationHub
- **Post Comment Trigger:** PostsController → POST /api/posts/{postId}/comments
  - Sau khi save comment → trigger notification cho postOwner
- **Friend Accept Trigger:** FriendshipsController → PUT /api/friendships/{requestId}/accept
  - Sau khi accept → trigger notification cho requester: "User X accepted your friend request"
- Transaction: Đảm bảo action + notification create atomic
- Files: *Controller.cs (update existing)

**NOTIF-P3-BE-F:** Migration + DB Sync
- `dotnet ef migrations add AddNotificationEntity`
- `dotnet ef database update`
- Verify: table Notifications created with correct schema, indices built

Lưu ý quan trọng - BẮT BUỘC:
- **Authorization:** Kiểm tra request.User.Id == userId trước khi return notification
- **Transaction:** Dùng `using (var tx = await _context.Database.BeginTransactionAsync())`
- **Soft Delete:** Không xóa thực sự, chỉ set IsDeleted = true
- **Audit Log:** Ghi log cho CREATE, UPDATE (read), DELETE actions
- **CorrelationId:** Lấy từ HttpContext.Items["X-Correlation-Id"], truyền vào logger
- **Pagination:** Mặc định pageSize=10, max=100, order by CreatedAt DESC
- **Error Handling:** Catch specific exceptions, log details, return user-friendly messages
- **Real-time:** Broadcast notification via NotificationHub ngay sau save, không delay
- **Race Condition:** Notification create không thể block action, nên run async nếu needed

Chi tiết file cần tạo/sửa:
- CREATE: `src/FacebookClone.Domain/Entities/Notification.cs`
- CREATE: `src/FacebookClone.Infrastructure/Repositories/NotificationRepository.cs`
- CREATE: `src/FacebookClone.API/Services/NotificationService.cs`
- CREATE: `src/FacebookClone.API/Hubs/NotificationHub.cs`
- CREATE: `src/FacebookClone.API/Controllers/NotificationsController.cs`
- UPDATE: `src/FacebookClone.API/Controllers/PostsController.cs` (add notification trigger in Like/Comment endpoints)
- UPDATE: `src/FacebookClone.API/Controllers/FriendshipsController.cs` (add notification trigger in Accept endpoint)
- UPDATE: `src/FacebookClone.Infrastructure/AppDbContext.cs` (add DbSet<Notification>)
- UPDATE: Entities folder để add NotificationType enum

Bắt đầu bằng cách: Đọc tất cả NOTIF-P3-BE subtasks, xác nhận với tôi.
```

---

## ✅ CHECKLIST PHASE 3 VALIDATION

☑️ **Frontend Session sẽ implement:**
- Notification Bell icon + unread badge
- Notification Panel dropdown with list
- SignalR event integration (NewNotification, NotificationRead, NotificationDeleted)
- notificationService.js with API + SignalR
- Real-time badge updates
- Click notification → navigate to related resource

✅ **Backend Session sẽ implement:**
- Notification entity with proper schema
- NotificationRepository with pagination
- NotificationService with authorization & audit logs
- NotificationHub for real-time broadcasting
- NotificationsController with 5 endpoints
- Trigger notifications from Post Like/Comment, Friend Accept
- Database migration + indices

---

**Sẵn sàng khởi động PHASE 3 không?**

- Tất cả PHASE 2 tasks đã hoàn tất?
- Frontend & Backend teams sẵn sàng?
- Bắt đầu PHASE 3 luôn hay có điều chỉnh?

---

