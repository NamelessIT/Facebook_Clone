# KẾ HOẠCH NÂNG CẤP HỆ THỐNG SAU KHI RÀ SOÁT CODEBASE

Cập nhật theo hiện trạng repo ngày 2026-07-14:

- Backend đang là ASP.NET Core solution tại `backend/FacebookClone.sln`, gồm `API`, `Application`, `Domain`, `Infrastructure`.
- Frontend đang là React/Vite tại `frontend/Facebook_Frontend`.
- Root hiện chưa có `package.json`; frontend mới có scripts `dev`, `build`, `lint`, `preview`.
- `docker-compose.yml` mới có PostgreSQL, chưa có Redis, backend, frontend, reverse proxy.
- Backend đã có `SecurityMiddleware` và `SecurityService` với in-memory rate limit/IP block/payload inspection, nhưng cần chuẩn hóa thành cấu hình production-ready, có module policy, có persistent/distributed store.
- Backend đã có enum trong `backend/src/FacebookClone.Domain/Enums`, nhưng frontend vẫn có nhiều constant/enum rải rác trong component/service.
- Chưa thấy test project backend, chưa có Vitest/Playwright cho frontend, chưa có CI pipeline.
- Lệnh `npx gitnexus analyze` cần được chạy trong môi trường có phép tải/thực thi package npm bên thứ ba. Trong phiên này `npx.ps1` bị PowerShell execution policy chặn, `npx.cmd` cần network/npm cache và bị sandbox từ chối vì rủi ro thực thi package ngoài.

## Mục tiêu

Biến repo thành một fullstack app có thể chạy, test, audit, build và deploy bằng một quy trình thống nhất; đồng thời gom các constant/enum, tăng bảo mật API, thêm rate limit/cache/transaction, và giảm lỗi do user thao tác lặp trên UI.

## Phase 0 - Audit và baseline

1. Chạy audit codebase:
   - Chạy `rg --files`, thống kê module, controller, service, repository, component, service frontend.
   - Chạy `npx gitnexus analyze` tại root trong môi trường được approve network/third-party execution.
   - Lưu kết quả vào `docs/audit/gitnexus-report.md` hoặc `docs/audit/codebase-baseline.md`.

2. Tạo root `package.json` để chạy cả FE và BE bằng một lệnh:
   - Thêm scripts root:
     - `dev`: chạy frontend Vite và backend `dotnet watch run` song song.
     - `dev:fe`: `npm --prefix frontend/Facebook_Frontend run dev`.
     - `dev:be`: `dotnet watch --project backend/src/FacebookClone.API/FacebookClone.API.csproj run`.
     - `build`: build frontend + backend.
     - `lint`: lint frontend + format/analyzers backend nếu có.
     - `test`: test frontend + backend.
   - Dùng `concurrently` hoặc `npm-run-all` để không phải mở 2 terminal.
   - Không hardcode port trong nhiều nơi; đưa API base URL về env/shared config.

3. Chuẩn hóa cấu hình:
   - Thêm `.env.example` cho root/frontend/backend.
   - Tách config dev/staging/prod: API URL, hub URL, JWT, CORS, Redis, PostgreSQL, upload path, rate limit.
   - Cập nhật README cách chạy một lệnh từ root.

Tiêu chí hoàn tất Phase 0:

- Từ root chạy được `npm run dev` để lên cả backend và frontend.
- Có report audit và danh sách risk hiện trạng.
- Root scripts không phá scripts hiện có của frontend.

## Phase 1 - Gom constant/enum thành source chung

1. Kiểm kê toàn bộ constant/enum cần gom:
   - Backend: `Domain/Enums`, `SecurityEventType`, rate limit numbers, CORS policy names, route prefixes, cache keys, notification types, media types, privacy/post/reaction/group/friendship/chat enums.
   - Frontend: `POST_PRIVACY`, `POST_TYPE`, `REACTIONS`, `PRIVACY_MAP`, `EVENT_TYPE_LABELS`, hub URLs, API base URL, localStorage keys, pagination limits, timeout values, upload limits, route names, error messages lặp lại.

2. Tạo folder source-of-truth:
   - Đề xuất: `shared/contracts`.
   - Chứa các file JSON/YAML có version: `enums.json`, `api-routes.json`, `limits.json`, `storage-keys.json`, `cache-keys.json`, `security-policies.json`.
   - Đây là nguồn chính; frontend/backend không tự định nghĩa lại enum/constant quan trọng.

3. Sinh code cho từng runtime:
   - Frontend import từ `frontend/Facebook_Frontend/src/shared/generated`.
   - Backend import từ project mới `backend/src/FacebookClone.Shared` hoặc folder shared được reference bởi Domain/Application/API.
   - Viết script `scripts/generate_shared_contracts.py` để generate JS/C# từ `shared/contracts`.
   - CI fail nếu generated files lệch với contract.

4. Refactor theo module, tránh làm một lần quá rộng:
   - Lần 1: API URL, hub URL, localStorage keys, route prefixes.
   - Lần 2: privacy/post/reaction/media/friendship/group/chat enums.
   - Lần 3: security/rate limit/cache constants.
   - Lần 4: UI labels/maps có liên quan đến enum.

Tiêu chí hoàn tất Phase 1:

- Không còn enum business trùng lặp giữa FE và BE.
- Sửa enum/limit trong `shared/contracts` và generate lại là FE/BE cùng cập nhật.
- Có test/check drift cho generated constants.

## Phase 2 - Rate limit middleware toàn hệ thống và theo module

1. Chuẩn hóa rate limit backend:
   - Dùng ASP.NET Core Rate Limiting middleware cho global policy.
   - Giữ custom `SecurityService` cho audit/security events, nhưng không để toàn bộ rate limit production chỉ nằm trong memory.
   - Định danh key theo IP + userId nếu đã authenticate.

2. Thêm policy theo module:
   - Auth: login/register/refresh-token stricter.
   - Post/Reels/Media: giới hạn create/upload/edit/delete.
   - Search: throttle cao hơn vì dễ bị spam.
   - Chat/Notification hubs: giới hạn connect/reconnect/message.
   - Admin: stricter + audit event bắt buộc.

3. Đưa limit về config:
   - `appsettings.json` có section `RateLimits`.
   - Hỗ trợ override bằng env cho staging/prod.
   - Trả response 429 chuẩn: `Retry-After`, correlation id, message ngắn gọn.

4. Redis/distributed rate limit:
   - Khi Redis bật, rate limit dùng distributed counter/token bucket.
   - Khi Redis mất, fallback policy rõ ràng và log cảnh báo.

Tiêu chí hoàn tất Phase 2:

- Mọi controller quan trọng có policy hoặc nằm dưới global policy.
- Load test nhỏ có thể chứng minh 429 xuất hiện đúng ngưỡng.
- Admin xem/reset được rate limit/block list nếu được phân quyền.

## Phase 3 - Test, CI và deploy script

1. Backend test:
   - Tạo test projects: `FacebookClone.UnitTests`, `FacebookClone.IntegrationTests`.
   - Unit test service: Auth, Post, Friendship, Notification, Chat, Security.
   - Integration test API với test database/container hoặc SQLite/Postgres test.
   - Test transaction/idempotency cho flow quan trọng.

2. Frontend test:
   - Thêm Vitest + React Testing Library.
   - Test services/axios interceptor/refresh token.
   - Test component chính: Login, PostItem, Create/Edit Post, Friend button, Notification bell, Chat input.
   - Thêm Playwright cho smoke E2E: login, tạo post, reaction/comment, friend request, chat/notification nếu có mock.

3. CI pipeline:
   - GitHub Actions: restore/install, lint, build, unit test, integration test, frontend test, e2e smoke nếu có service.
   - Cache npm/NuGet.
   - Upload coverage/log artifacts.
   - Fail fast nếu shared generated contracts bị lệch.

4. Python deploy script chạy được bằng Git Bash:
   - Tạo `scripts/deploy.py`.
   - Chạy được bằng `python scripts/deploy.py` và `python3 scripts/deploy.py`.
   - Terminal log có step/status/duration.
   - Quy trình: check env -> install/restore -> generate shared contracts -> lint -> test -> build -> docker compose build/up -> migration -> health check -> deploy nếu config đủ.
   - Có dry-run: `--dry-run`.
   - Không deploy nếu thiếu env/secrets bắt buộc.

Tiêu chí hoàn tất Phase 3:

- `npm run test` tại root test được FE + BE.
- CI xanh trên PR.
- Deploy script dừng an toàn khi cấu hình chưa đủ và log rõ lý do dừng.

## Phase 4 - Kiểm tra button, debounce/throttle/rate-limit trên UI

1. Lập danh sách toàn bộ button/action:
   - Tìm `button`, `onClick`, submit form, keyboard submit, upload, reaction, save, share, delete, admin action, chat send.
   - Phân loại: read action, write action, destructive action, upload action, repeated action.

2. Tạo shared hooks/util:
   - `useDebouncedAction` cho submit/search.
   - `useThrottledAction` cho reaction/scroll/load more.
   - `useSingleFlightAction` cho POST/PUT/PATCH/DELETE để chặn double submit.
   - Standard loading/disabled state cho button.

3. Áp dụng theo module:
   - Auth: login/register không double submit.
   - Post: create/edit/delete/share/save/reaction/comment có loading/idempotency.
   - Friendship: request/accept/reject/unfriend có lock.
   - Chat: send message throttle/single-flight và optimistic state an toàn.
   - Admin: ban/unban/block IP/reset rate limit có confirm và loading.
   - Upload/Reels: giới hạn click, cancel/retry rõ ràng.

4. Kết hợp backend:
   - Thêm idempotency key cho write action quan trọng.
   - Nếu backend trả 429, frontend hiện thông báo và tôn trọng `Retry-After`.

Tiêu chí hoàn tất Phase 4:

- Không có write button quan trọng nào gọi API trùng khi user click liên tục.
- Playwright có test double-click/smoke cho các flow chính.

## Phase 5 - Bảo vệ data và request API

1. Authentication/authorization:
   - Đảm bảo mọi endpoint private có `[Authorize]`.
   - Admin endpoint có role/policy riêng.
   - Object-level authorization: post owner, profile privacy, collection owner, conversation member.

2. Token/session:
   - Ưu tiên refresh token trong httpOnly secure cookie khi deploy.
   - Rotate refresh token và revoke token cũ trong transaction.
   - Giảm lưu token trong `localStorage` nếu có thể; nếu chưa đổi ngay, ghi risk và roadmap.

3. Request validation:
   - Thêm FluentValidation hoặc validation filters cho DTO.
   - Giới hạn payload size, file type, file size, extension, content-type.
   - Sanitize output/input nhạy cảm, tránh XSS/SQL injection/path traversal.

4. Security headers/CORS:
   - CORS theo whitelist env, không hardcode môi trường prod.
   - Thêm HSTS/HTTPS redirection prod, CSP cân bằng với Vite assets, X-Content-Type-Options, Referrer-Policy.
   - Correlation id/audit log không log secret/token/password.

5. Secrets:
   - Không để JWT secret/DB password prod trong repo.
   - Thêm secret scan trong CI nếu có thể.

Tiêu chí hoàn tất Phase 5:

- Security review endpoint-by-endpoint có file checklist.
- Test authorization bắt được user truy cập data không phải của mình.

## Phase 6 - Redis/cache/session/SSE notification

1. Redis infrastructure:
   - Thêm Redis vào `docker-compose.yml`.
   - Thêm config `Redis:ConnectionString`.
   - Backend đăng ký `IDistributedCache`/Redis cache và health check.

2. Cache strategy:
   - Cache read-heavy: profile public, feed page, search results ngắn hạn, notification count, friend suggestions, saved collections metadata.
   - Cache invalidation khi post/comment/reaction/friendship/profile thay đổi.
   - Dùng cache key từ shared constants.

3. Session/online state:
   - Lưu online/presence/session lightweight vào Redis.
   - Nếu scale nhiều instance, dùng Redis backplane cho SignalR nếu tiếp tục dùng SignalR.

4. SSE cho thông báo user đăng bài:
   - Tạo endpoint SSE, ví dụ `GET /api/v1/notifications/stream` hoặc `GET /api/v1/posts/events`.
   - Gửi heartbeat theo chu kỳ.
   - Dùng cancellation token để đóng kết nối khi user disconnect.
   - Có timeout/reconnect policy; frontend dùng `EventSource` và backoff.
   - Khi user đăng bài/comment/reaction tạo event notification, push qua SSE/SignalR tùy loại client.
   - Nếu user mất kết nối giữa chừng, event quan trọng vẫn lưu DB và client sync lại bằng REST sau reconnect.

Tiêu chí hoàn tất Phase 6:

- Redis chạy trong dev compose.
- Cache có metric hit/miss/log.
- SSE disconnect không làm leak task/connection.

## Phase 7 - Blacklist/whitelist và chặn user/IP

1. Persistent security list:
   - Tạo bảng/cấu hình cho IP blacklist, IP whitelist, user blacklist, email/domain blacklist nếu cần.
   - Cache list trong Redis, có invalidation khi admin cập nhật.
   - Không chỉ lưu in-memory trong singleton.

2. Middleware enforcement:
   - Whitelist được check trước rate limit với policy rõ ràng.
   - Blacklist trả 403 và ghi audit event.
   - Hỗ trợ block theo IP, userId, email, device/session nếu có đủ dữ liệu.

3. Admin UI/API:
   - Quản lý block/unblock, duration, reason, automatic/manual flag.
   - Tìm kiếm/filter event.
   - Log ai đã chặn/mở chặn.

Tiêu chí hoàn tất Phase 7:

- Restart backend không mất blacklist/whitelist.
- Admin có thể chặn 1 user bất kỳ và user đó bị chặn ở API/hub cần thiết.

## Phase 8 - Transaction/idempotency cho quy trình quan trọng

1. Tạo transaction boundary:
   - Thêm Unit of Work hoặc dùng `AppDbContext.Database.BeginTransactionAsync` tại Application service cho flow nhiều write.
   - Không để repository tự `SaveChangesAsync` qua nhiều bước mà không có transaction khi workflow cần atomicity.

2. Flow bắt buộc có transaction:
   - Auth: login/refresh-token/logout token rotation.
   - Post: create post + media + notification.
   - Comment/reaction/share/save collection.
   - Friend request/accept/reject/unfriend.
   - Chat: create conversation + members + first message.
   - Reels/upload complete.
   - Admin ban/unban/block/unblock.

3. Idempotency:
   - Thêm idempotency key cho write API để user click lại/request retry không tạo duplicate.
   - Unique constraint cho business rule: reaction 1 user/post, friendship pair, saved collection item, reel like.
   - Xử lý concurrency conflict thân thiện.

4. Outbox cho side effects:
   - Notification/email/realtime event nên ghi outbox trong transaction, publish sau commit.
   - Nếu publish fail, retry background job.

Tiêu chí hoàn tất Phase 8:

- Integration test chứng minh rollback khi một bước fail.
- Double submit/retry không tạo duplicate data.

## Thứ tự ưu tiên để làm

1. Phase 0: audit + root scripts + config baseline.
2. Phase 1: shared constants/enums vì đây là nền cho các phase sau.
3. Phase 2 + Phase 5: rate limit và security API.
4. Phase 3: test/CI/deploy script để khóa chặt chất lượng.
5. Phase 4: debounce/throttle UI.
6. Phase 6: Redis/cache/SSE.
7. Phase 7: blacklist/whitelist persistent.
8. Phase 8: transaction/idempotency cho các workflow còn lại, ưu tiên flow có rủi ro duplicate/mất data.

## Checklist xác nhận cuối cùng

- Root có `package.json` và `npm run dev` chạy cả FE/BE.
- `npx gitnexus analyze` đã được chạy trong môi trường an toàn và có report.
- Constant/enum quan trọng nằm trong `shared/contracts`, FE/BE dùng generated source.
- Rate limit có global + module policy, có 429/Retry-After, có admin reset/block.
- Test/CI bao phủ build/lint/unit/integration/e2e smoke.
- Deploy script Python chạy được bằng `python` và `python3` trên Git Bash.
- Button write action có debounce/throttle/single-flight/loading state.
- API có authz/object-level checks, validation, headers, CORS, secret hygiene.
- Redis/cache/session/SSE được cấu hình và có fallback/log.
- Blacklist/whitelist persistent, admin quản lý được user/IP.
- Workflow quan trọng có transaction, idempotency và test rollback.
