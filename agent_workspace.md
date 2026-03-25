# BẢNG CÔNG VIỆC DỰ ÁN FACEBOOK_CLONE
**Cập nhật lần cuối:** 2026-03-25 14:20  
**Trạng thái tổng thể:** ⏳ NOT STARTED

---

## 1) TỔNG QUAN & PHỤ THUỘC

```text
SEARCH  ─┐
FRIENDS ─┼──> POSTS ──> NOTIFICATIONS
         └──> PROFILE/FRIEND DETAIL

Ghi chú:
- Session 1: Frontend
- Session 2: Backend
- Hai session chạy song song, mỗi session chỉ xử lý phần FE hoặc BE của từng task.
```

---

## 2) QUY TẮC CHUNG CHO HAI SESSION

- Luôn đọc [agent_workspace.md](agent_workspace.md) trước khi làm việc.
- Chỉ xử lý các subtask có tag phù hợp: `FE` cho Session 1, `BE` cho Session 2.
- Làm đúng thứ tự trong từng task group, không tự nhảy task.
- Xong mỗi subtask thì báo lại: subtask nào, file nào, đã đổi gì, còn gap nào nếu có.
- Không tự sửa [agent_workspace.md](agent_workspace.md); Manager sẽ tick trạng thái.
- Ưu tiên tái sử dụng component/service hiện có, không tạo UI hay abstraction thừa.

---

## 3) TASK-001 | SEARCH

**Mục tiêu:** tìm theo content bài viết và theo người dùng/bạn bè.  
**Ưu tiên:** CAO

### Frontend subtasks

- [ ] **SRCH-FE-01** — Search bar debounce và suggestion dropdown
  - Search theo từ khóa, debounce rõ ràng.
  - Hiển thị gợi ý người dùng gần đúng.
  - Chọn gợi ý thì điều hướng vào trang kết quả.
  - File: [frontend/Facebook_Frontend/src/components/common/SearchBar.jsx](frontend/Facebook_Frontend/src/components/common/SearchBar.jsx)

- [ ] **SRCH-FE-02** — Search results page với tab Users / Posts
  - Tách 2 tab rõ ràng.
  - Mỗi tab có empty, loading, pagination state riêng.
  - File: [frontend/Facebook_Frontend/src/pages/Search/SearchResultsPage.jsx](frontend/Facebook_Frontend/src/pages/Search/SearchResultsPage.jsx)

- [ ] **SRCH-FE-03** — Tích hợp action từ kết quả search
  - User card có nút add friend.
  - Post card đi tới post tương ứng.
  - File: [frontend/Facebook_Frontend/src/pages/Search/SearchResultsPage.jsx](frontend/Facebook_Frontend/src/pages/Search/SearchResultsPage.jsx)

- [ ] **SRCH-FE-04** — Service cho search API
  - Wrapper rõ ràng cho search users/posts.
  - Xử lý pagination params thống nhất.
  - File: [frontend/Facebook_Frontend/src/services/userService.js](frontend/Facebook_Frontend/src/services/userService.js), [frontend/Facebook_Frontend/src/services/postService.js](frontend/Facebook_Frontend/src/services/postService.js)

### Backend subtasks

- [ ] **SRCH-BE-01** — Search DTOs và response contract
  - DTO cho user search result.
  - DTO cho post search result.
  - DTO/contract cho response phân trang.
  - File: [backend/src/FacebookClone.Application/DTOs/Search/SearchUserDto.cs](backend/src/FacebookClone.Application/DTOs/Search/SearchUserDto.cs), [backend/src/FacebookClone.Application/DTOs/Search/SearchResultDto.cs](backend/src/FacebookClone.Application/DTOs/Search/SearchResultDto.cs)

- [ ] **SRCH-BE-02** — Search service business logic
  - Search theo content và theo user.
  - Không xử lý HTTP ở service.
  - File: [backend/src/FacebookClone.Application/Services/Implementations/SearchService.cs](backend/src/FacebookClone.Application/Services/Implementations/SearchService.cs)

- [ ] **SRCH-BE-03** — Search controller endpoints
  - GET users.
  - GET posts.
  - Validate query/page/limit ngay đầu request.
  - File: [backend/src/FacebookClone.API/Controllers/SearchController.cs](backend/src/FacebookClone.API/Controllers/SearchController.cs)

---

## 4) TASK-002 | FRIENDS

**Mục tiêu:** gửi lời mời, accept/reject, danh sách bạn bè, remove friend.  
**Ưu tiên:** CAO

### Frontend subtasks

- [ ] **FRI-FE-01** — Add Friend button theo trạng thái
  - Trạng thái: add, pending sent, pending received, friends.
  - File: [frontend/Facebook_Frontend/src/components/friendship/AddFriendButton.jsx](frontend/Facebook_Frontend/src/components/friendship/AddFriendButton.jsx)

- [ ] **FRI-FE-02** — Friend list có pagination
  - Hiển thị danh sách bạn bè.
  - Có hành động hủy kết bạn.
  - File: [frontend/Facebook_Frontend/src/components/friendship/FriendList.jsx](frontend/Facebook_Frontend/src/components/friendship/FriendList.jsx)

- [ ] **FRI-FE-03** — Friends page cho requests và list
  - Tab requests và tab friends.
  - Accept / reject friend request.
  - File: [frontend/Facebook_Frontend/src/pages/Friends/index.jsx](frontend/Facebook_Frontend/src/pages/Friends/index.jsx)

- [ ] **FRI-FE-04** — Friendship service functions
  - Send, accept, reject, remove, get list, get requests.
  - File: [frontend/Facebook_Frontend/src/services/friendshipService.js](frontend/Facebook_Frontend/src/services/friendshipService.js)

### Backend subtasks

- [ ] **FRI-BE-01** — Friendship entity và mapping
  - Entity, enum status, unique index, no-self-request check.
  - File: [backend/src/FacebookClone.Domain/Entities/Friendship.cs](backend/src/FacebookClone.Domain/Entities/Friendship.cs), [backend/src/FacebookClone.Infrastructure/AppDbContext.cs](backend/src/FacebookClone.Infrastructure/AppDbContext.cs)

- [ ] **FRI-BE-02** — Repository cho friend workflow
  - Send / accept / reject / remove / list / requests.
  - Kiểm tra duplicate và concurrency.
  - File: [backend/src/FacebookClone.Infrastructure/Repositories/FriendshipRepository.cs](backend/src/FacebookClone.Infrastructure/Repositories/FriendshipRepository.cs)

- [ ] **FRI-BE-03** — Friends controller
  - Endpoints cho request, accept, reject, remove, list.
  - Chuẩn response `{ success, message, data }`.
  - File: [backend/src/FacebookClone.API/Controllers/FriendshipsController.cs](backend/src/FacebookClone.API/Controllers/FriendshipsController.cs)

- [ ] **FRI-BE-04** — Migration và sync schema
  - Đảm bảo schema friendship khớp entity.
  - File: [backend/src/FacebookClone.Infrastructure/Migrations/](backend/src/FacebookClone.Infrastructure/Migrations/)

---

## 5) TASK-003 | POSTS

**Mục tiêu:** edit post giống Facebook, comment/reply, share post.  
**Ưu tiên:** CAO

### Frontend subtasks

- [ ] **POST-FE-01** — Edit post modal và validation
  - Edit content, media, validation lỗi.
  - File: [frontend/Facebook_Frontend/src/components/post/PostItem.jsx](frontend/Facebook_Frontend/src/components/post/PostItem.jsx)

- [ ] **POST-FE-02** — Delete post confirmation
  - Confirm dialog rõ ràng, loading state, refresh feed sau xóa.
  - File: [frontend/Facebook_Frontend/src/components/post/PostItem.jsx](frontend/Facebook_Frontend/src/components/post/PostItem.jsx)

- [ ] **POST-FE-03** — Comment reply UI
  - Reply nested theo comment cha.
  - Hiển thị thread dễ đọc.
  - File: [frontend/Facebook_Frontend/src/components/post/](frontend/Facebook_Frontend/src/components/post/)

- [ ] **POST-FE-04** — Share post UI
  - Hành vi share rõ ràng, giữ nguyên source post.
  - File: [frontend/Facebook_Frontend/src/components/post/](frontend/Facebook_Frontend/src/components/post/)

- [ ] **POST-FE-05** — Post service contract
  - Update/delete/share/comment/reply wrapper.
  - File: [frontend/Facebook_Frontend/src/services/postService.js](frontend/Facebook_Frontend/src/services/postService.js)

### Backend subtasks

- [ ] **POST-BE-01** — Update post DTO và validation
  - DTO cho update post.
  - Validation content/media.
  - File: [backend/src/FacebookClone.Application/DTOs/](backend/src/FacebookClone.Application/DTOs/)

- [ ] **POST-BE-02** — Update/delete post flow
  - Authorization theo chủ post.
  - Transaction và audit log.
  - File: [backend/src/FacebookClone.API/Controllers/PostsController.cs](backend/src/FacebookClone.API/Controllers/PostsController.cs), [backend/src/FacebookClone.Application/Services/Implementations/](backend/src/FacebookClone.Application/Services/Implementations/)

- [ ] **POST-BE-03** — Comment và reply flow
  - Comment cha/con, validate reply chain.
  - File: [backend/src/FacebookClone.API/Controllers/PostsController.cs](backend/src/FacebookClone.API/Controllers/PostsController.cs), [backend/src/FacebookClone.Domain/Entities/Comment.cs](backend/src/FacebookClone.Domain/Entities/Comment.cs)

- [ ] **POST-BE-04** — Share post flow
  - Share post theo model hiện tại.
  - File: [backend/src/FacebookClone.API/Controllers/PostsController.cs](backend/src/FacebookClone.API/Controllers/PostsController.cs), [backend/src/FacebookClone.Domain/Entities/Post.cs](backend/src/FacebookClone.Domain/Entities/Post.cs)

- [ ] **POST-BE-05** — Migration / snapshot sync nếu cần
  - Chỉ làm khi entity thay đổi.
  - File: [backend/src/FacebookClone.Infrastructure/Migrations/](backend/src/FacebookClone.Infrastructure/Migrations/)

---

## 6) TASK-004 | NOTIFICATIONS

**Mục tiêu:** thông báo realtime, mark as read, click đi đúng target.  
**Ưu tiên:** CAO

### Frontend subtasks

- [ ] **NOTIF-FE-01** — Notification bell + badge
  - Badge unread count.
  - Toggle panel khi click.
  - File: [frontend/Facebook_Frontend/src/components/Notifications/NotificationBell.jsx](frontend/Facebook_Frontend/src/components/Notifications/NotificationBell.jsx)

- [ ] **NOTIF-FE-02** — Notification panel
  - List, empty state, load more, mark as read.
  - File: [frontend/Facebook_Frontend/src/components/Notifications/NotificationPanel.jsx](frontend/Facebook_Frontend/src/components/Notifications/NotificationPanel.jsx)

- [ ] **NOTIF-FE-03** — Notification service
  - REST calls + SignalR listeners.
  - File: [frontend/Facebook_Frontend/src/services/notificationService.js](frontend/Facebook_Frontend/src/services/notificationService.js)

- [ ] **NOTIF-FE-04** — Route handling theo loại notification
  - Friend request → profile/friends.
  - Post action → focus đúng post.
  - Message → mở chat/conversation.
  - File: [frontend/Facebook_Frontend/src/components/Notifications/NotificationPanel.jsx](frontend/Facebook_Frontend/src/components/Notifications/NotificationPanel.jsx)

### Backend subtasks

- [ ] **NOTIF-BE-01** — Notification entity / enum / mapping
  - Thêm field cần thiết cho read state và target.
  - File: [backend/src/FacebookClone.Domain/Entities/Notification.cs](backend/src/FacebookClone.Domain/Entities/Notification.cs), [backend/src/FacebookClone.Domain/Enums/NotificationType.cs](backend/src/FacebookClone.Domain/Enums/NotificationType.cs)

- [ ] **NOTIF-BE-02** — Notification repository + service
  - Create, list, unread count, mark read, mark all read.
  - File: [backend/src/FacebookClone.Infrastructure/Repositories/NotificationRepository.cs](backend/src/FacebookClone.Infrastructure/Repositories/NotificationRepository.cs), [backend/src/FacebookClone.Application/Services/Implementations/NotificationService.cs](backend/src/FacebookClone.Application/Services/Implementations/NotificationService.cs)

- [ ] **NOTIF-BE-03** — Notification hub realtime broadcast
  - Push new notification, badge update.
  - File: [backend/src/FacebookClone.API/Hubs/NotificationHub.cs](backend/src/FacebookClone.API/Hubs/NotificationHub.cs), [backend/src/FacebookClone.API/Services/NotificationHubService.cs](backend/src/FacebookClone.API/Services/NotificationHubService.cs)

- [ ] **NOTIF-BE-04** — Notifications controller
  - List, unread count, read, read all.
  - File: [backend/src/FacebookClone.API/Controllers/NotificationsController.cs](backend/src/FacebookClone.API/Controllers/NotificationsController.cs)

- [ ] **NOTIF-BE-05** — Emit notifications from post/friend actions
  - Like/comment/friend accept triggers.
  - File: [backend/src/FacebookClone.API/Controllers/PostsController.cs](backend/src/FacebookClone.API/Controllers/PostsController.cs), [backend/src/FacebookClone.API/Controllers/FriendshipsController.cs](backend/src/FacebookClone.API/Controllers/FriendshipsController.cs)

- [ ] **NOTIF-BE-06** — Migration and schema sync
  - Chỉ chạy khi model thay đổi.
  - File: [backend/src/FacebookClone.Infrastructure/Migrations/](backend/src/FacebookClone.Infrastructure/Migrations/)

---

## 7) PROMPT SESSION 1 - FRONTEND

```text
Bạn là Session 1 - Frontend Execution Agent.

Nhiệm vụ:
- Đọc [agent_workspace.md](agent_workspace.md)
- Xử lý toàn bộ subtask có tag FE theo đúng thứ tự trong từng task group
- Chỉ sửa file frontend, không đụng backend
- Dùng shared component hiện có nếu đã có sẵn
- Không tự sửa [agent_workspace.md](agent_workspace.md)

Quy trình:
1. Xác nhận task group đang làm.
2. Chạy từng subtask FE một cách tuần tự.
3. Sau mỗi subtask, báo rõ:
   - subtask nào đã xong
   - file nào đã sửa/tạo
   - logic gì đã thay đổi
   - còn gap gì nếu chưa thể hoàn thiện
4. Khi xong một task group, tóm tắt kết quả và chờ nhóm tiếp theo nếu cần.

Phạm vi ưu tiên:
- Search
- Friends
- Posts
- Notifications

Yêu cầu chất lượng:
- Loading / empty / error state phải rõ.
- Không hardcode string trạng thái nếu có enum/constant phù hợp.
- Không thêm UI dư thừa.
```

---

## 8) PROMPT SESSION 2 - BACKEND

```text
Bạn là Session 2 - Backend Execution Agent (.NET C#).

Nhiệm vụ:
- Đọc [agent_workspace.md](agent_workspace.md)
- Xử lý toàn bộ subtask có tag BE theo đúng thứ tự trong từng task group
- Chỉ sửa backend, không đụng frontend
- Không tự sửa [agent_workspace.md](agent_workspace.md)

Quy trình:
1. Xác nhận task group đang làm.
2. Chạy từng subtask BE tuần tự.
3. Sau mỗi subtask, báo rõ:
   - subtask nào đã xong
   - file nào đã sửa/tạo
   - business logic nào đã thay đổi
   - migration nào cần chạy thêm nếu có
4. Ưu tiên đảm bảo contract API ổn định trước khi chuyển task khác.

Ràng buộc kỹ thuật:
- Validate input sớm.
- Dùng transaction cho flow nhiều bước.
- Không log sensitive data.
- Response format phải theo chuẩn `{ success, message, data }`.
- Nếu liên quan notification/realtime thì phải giữ correlationId và audit log khi cần.

Phạm vi ưu tiên:
- Search
- Friends
- Posts
- Notifications
```

---

## 9) CHECKLIST TRƯỚC KHI BẮT ĐẦU

- [ ] Task breakdown đã đủ rõ để giao cho 2 session.
- [ ] Session 1 chỉ làm FE.
- [ ] Session 2 chỉ làm BE.
- [ ] Thứ tự ưu tiên đã hợp lý: Search → Friends → Posts → Notifications.
- [ ] Không còn nội dung task cũ gây nhiễu trong plan.

