# PLAN.md - Ke hoach nang cap Facebook_Clone

Cap nhat theo codebase ngay 2026-08-03.

## 0. Hien trang codebase

Du an hien la fullstack app gom:

- Backend ASP.NET Core tai `backend/FacebookClone.sln`, chia thanh `FacebookClone.API`, `FacebookClone.Application`, `FacebookClone.Domain`, `FacebookClone.Infrastructure`.
- Frontend React/Vite tai `frontend/Facebook_Frontend`.
- Shared contracts tai `shared/contracts`, co script generate `scripts/generate_shared_contracts.py`.
- Root da co `package.json` de chay FE/BE cung luc: `npm run dev`, build, test, seed.
- Docker compose da co PostgreSQL va Redis: `docker-compose.yml`.
- CI dang chay thu cong qua `.github/workflows/ci.yml` bang `workflow_dispatch`, khong tu chay khi push neu khong bam run.
- Frontend da co Playwright E2E smoke tests trong `frontend/Facebook_Frontend/tests/e2e` de lam gate truoc CD.
- Backend da co SignalR hubs: `ChatHub`, `NotificationHub`.
- Backend da co Redis/fallback distributed cache qua `ICacheService`/`CacheService`.
- Backend da co RBAC tables/entities/migrations: `Roles`, `Permissions`, `RolePermissions`, `UserRoles`.
- Admin API dang nam trong `backend/src/FacebookClone.API/Controllers/AdminController.cs`.
- Security block list da co blacklist va whitelist qua `SecurityBlockEntry`, `BlockListKind.Blacklist`, `BlockListKind.Whitelist`, `SecurityBlockService`, `PersistentBlockMiddleware`.
- Seed data hien co nhung con mong: `UserSeeder`, `PostSeeder`, `FriendshipSeeder`, `InteractionSeeder`, `ChatSeeder`, `NotificationSeeder`, `RbacSeeder`, `LocalizationSeeder`.
- Frontend chua co IndexedDB/offline outbox. Hien moi co `localStorage`, axios refresh queue, SignalR services va cac hooks debounce/single-flight.

GitNexus:

- User da chay `npx gitnexus analyze` va analyzer bao `Already up to date`.
- Khi lap plan nay, CLI `node .gitnexus/run.cjs query` trong wrapper bi tach query thanh nhieu argument, nen bo sung bang `rg` tren codebase va cac file module lien quan.

## 1. Muc tieu tong quat

1. Them co che offline-first/eventual consistency tren client bang IndexedDB de luu action khi mat mang/API loi, dong bo lai an toan khi ket noi phuc hoi.
2. Chuan hoa admin `/admin`, RBAC theo cap: admin khong duoc tao/sua/gan role co level cao hon hoac bang cap cao nhat cua minh, tru truong hop super admin/system policy duoc quy dinh ro.
3. Kiem tra va hoan thien whitelist/blacklist co Redis cache, dam bao middleware ap dung dung thu tu va admin quan ly duoc.
4. Mo rong seed data thanh bo du lieu test day du, co nhieu user, anh, post, reel, comment, reaction, friendship, chat, notification, saved collections, roles va security entries.
5. Them Playwright E2E vao CI gate truoc CD: test dang nhap, route user/admin, module chinh, console/page error; xuat log/report ro tren terminal va artifact de coder debug nhanh.

## 1.1. CI/CD gate bang Playwright

Nguyen tac:

- Push code khong tu kich hoat CI/CD. Workflow GitHub Actions chi chay khi user bam `Run workflow` hoac goi chu dong.
- CD/deploy local van chay qua Git Bash bang `python scripts/deploy.py` hoac `python3 scripts/deploy.py`.
- CI phai chay truoc CD, gom:
  - shared contracts drift check.
  - backend restore/build/test.
  - frontend lint/unit/build.
  - Playwright E2E smoke voi PostgreSQL + Redis service rieng.
- Playwright phai log truc tiep ra terminal bang reporter `list`, dong thoi upload:
  - `playwright-report`.
  - `test-results/playwright-junit.xml`.
  - `backend-e2e.log`.
- E2E smoke toi thieu:
  - Alice dang nhap va mo home feed.
  - Cac module user `/`, `/friends`, `/messages`, `/reels`, `/saved`, `/settings` load khong co runtime page error.
  - Admin dang nhap va vao duoc `/admin`.
  - User thuong bi chan khi vao `/admin`.
- Moi test thu thap browser console warning/error va page error. Neu co page error thi fail test, attach log de coder thay ngay nguyen nhan.
- Khi mo rong module moi, them E2E smoke tuong ung truoc khi cho phep CD.

## 2. Phase 1 - IndexedDB offline outbox va eventual consistency

### 2.1. Thiet ke contract action

Tao contract chung trong `shared/contracts/constants.json` hoac file moi `shared/contracts/offline-actions.json`:

- `offline.maxActions`: 1000.
- `offline.maxAgeDays`: 30.
- `offline.syncBatchSize`: 25-50.
- `offline.retryBackoffMs`: cac moc retry.
- `offline.status`: `pending`, `syncing`, `completed`, `failed`, `rolled_back`, `expired`, `paused`, `conflict`.
- `offline.actionTypes`: post create/update/delete/share, comment create/delete, reaction set/remove, save/unsave, friendship send/accept/reject/remove, chat send, reel create/update/delete, profile update.
- Trang thai cua moi action bat buoc duoc luu trong IndexedDB, khong chi luu payload. Moi lan sync phai cap nhat `status`, `attemptCount`, `lastAttemptAt`, `errorCode`, `errorMessage`, `completedAt` neu co.
- Neu trong luc quet code thay enum/type/constant/thong so lap lai lien quan offline sync, retry, upload, action type, status, API path, storage key thi refactor ve `shared/contracts` truoc, sau do generate lai source FE/BE. Khong tao constant offline rieng le trong component/service.
- Video upload chunk limits:
  - `uploadChunks.maxRecords`: 2000 record toi da trong IndexedDB cho chunk upload metadata.
  - Moi chunk record luu `uploadId`, `fileFingerprint`, `targetType` (`post` hoac `reel`), `targetId`, `chunkIndex`, `totalChunks`, `chunkSizeBytes`, `status`, `etag/serverPartId`, `attemptCount`, `lastAttemptAt`, `errorMessage`.
  - Chunk data lon khong nen giu vinh vien trong DB neu browser/storage khong cho phep; uu tien luu metadata + file handle/fingerprint. Neu can luu blob tam thoi thi phai ap dung TTL va quota warning.

Generate lai frontend/backend constants bang:

```bash
python scripts/generate_shared_contracts.py
```

### 2.2. Frontend IndexedDB layer

Tao module moi:

- `frontend/Facebook_Frontend/src/offline/indexedDb.js`
- `frontend/Facebook_Frontend/src/offline/offlineQueue.js`
- `frontend/Facebook_Frontend/src/offline/syncEngine.js`
- `frontend/Facebook_Frontend/src/offline/idempotency.js`
- `frontend/Facebook_Frontend/src/contexts/OfflineSyncContext.jsx`

De xuat dung thu vien nhe:

- Uu tien `idb` vi gon va it abstraction.
- Chi dung Dexie neu can query phuc tap hon.

Schema IndexedDB de xuat:

- DB name: `fbclone_offline`.
- Store `actions`:
  - `id`: local uuid.
  - `idempotencyKey`: uuid stable cho moi action.
  - `type`: action type.
  - `method`, `url`, `body`, `headers`.
  - `entityType`, `entityId`, `localEntityId`.
  - `status`.
  - `attemptCount`.
  - `createdAt`, `updatedAt`, `lastAttemptAt`, `expiresAt`.
  - `errorCode`, `errorMessage`.
  - `rollbackStrategy`.
  - `completedAt`.
- Store `uploadChunks`:
  - `id`: `${uploadId}:${chunkIndex}`.
  - `uploadId`: id stable cua upload session.
  - `fileFingerprint`: hash/metadata fingerprint de biet co dung file cu khong.
  - `targetType`: `post` hoac `reel`.
  - `targetId`: post/reel local id hoac server id.
  - `chunkIndex`, `totalChunks`, `chunkSizeBytes`.
  - `status`: `pending`, `uploading`, `completed`, `failed`, `paused`, `expired`.
  - `etag` hoac `serverPartId` neu server tra ve.
  - `attemptCount`, `lastAttemptAt`, `errorMessage`, `createdAt`, `updatedAt`, `expiresAt`.
- Store `entitySnapshots`:
  - luu optimistic snapshot de rollback khi action fail vinh vien.
- Store `syncMeta`:
  - `lastSuccessfulSyncAt`, `clientId`, `schemaVersion`.

### 2.3. Axios/offline interceptor

Refactor quanh:

- `frontend/Facebook_Frontend/src/services/axiosClient.js`
- cac service write: `postService.js`, `friendshipService.js`, `chatService.js`, `savedItemsService.js`, `reelService.js`, `userService.js`.

Quy tac:

- GET khong dua vao offline queue, tru khi can stale cache read-only o phase sau.
- POST/PUT/PATCH/DELETE quan trong tao `Idempotency-Key`.
- Neu browser offline, network timeout, API 502/503/504 hoac request bi cancel do mat mang: ghi action vao IndexedDB voi `pending`.
- Neu API tra 400/401/403/404 do business/auth: khong retry tu dong, danh dau `failed` va hien toast debug ro.
- Neu API tra 409 conflict: goi conflict resolver theo tung entity.

### 2.4. Sync engine

Trigger sync khi:

- app start.
- user login thanh cong.
- event `window.online`.
- SignalR reconnect.
- interval nhe, vi du moi 1-5 phut neu co pending.
- user bam nut "Dong bo lai" trong UI debug.

Flow sync:

1. Lay toi da `syncBatchSize` action `pending/failed retryable` theo `createdAt`.
2. Chuyen sang `syncing`.
3. Goi API voi `Idempotency-Key`.
4. Thanh cong: update status `completed`, luu `serverEntityId` neu co.
5. Conflict/rejected: chuyen `failed`, giu error ro.
6. Neu qua `maxAgeDays` hoac vuot 1000 action: roll clear theo chinh sach.

Roll clear:

- Luon giu toi da 1000 action moi nhat cua user.
- Luon giu toi da 2000 upload chunk metadata record moi nhat cua user.
- Xoa action `completed` cu hon 30 ngay.
- Xoa upload chunk `completed` cu hon 30 ngay.
- Xoa action `failed/expired` cu hon 30 ngay nhung nen log count vao console/toast debug.
- Xoa upload session `failed/expired` cu hon 30 ngay sau khi da bao loi ro cho user.
- Khong xoa action `pending/syncing` chua het han, tru khi vuot 1000 thi uu tien giu action moi nhat va action co muc do quan trong cao.
- Khong xoa chunk `pending/uploading/paused` chua het han, tru khi vuot 2000 record thi uu tien giu upload session moi nhat va pause session cu voi toast/debug message.

### 2.4.1. Resumable video upload cho post va reel

Khi upload video cho post/reel:

1. Tao `uploadId` va `fileFingerprint` truoc khi goi API.
2. Chia file thanh chunks theo chunk size cau hinh trong `shared/contracts`.
3. Luu metadata tung chunk vao IndexedDB store `uploadChunks`.
4. Upload tung chunk va cap nhat status:
   - `pending` -> `uploading` -> `completed`.
   - Neu mat mang/API loi retryable: chuyen `failed` hoac `paused` nhung giu `chunkIndex` hien tai.
5. Khi browser online lai, sync engine tim upload session con dang `pending/failed/paused` va tiep tuc tu chunk dau tien chua `completed`.
6. Chi complete post/reel video upload khi server da nhan du tat ca chunks va API finalize thanh cong.
7. Neu user refresh trang:
   - Neu con file handle/blob hop le, tiep tuc upload chunk dang do.
   - Neu mat file handle, hien UI yeu cau chon lai dung file; so sanh `fileFingerprint`, neu khop thi tiep tuc tu chunk chua upload.

Tieu chi rieng:

- Upload reel 100MB, mat mang o chunk 12/40, bat mang lai phai tiep tuc tu chunk 12 hoac 13 theo status server, khong upload lai tu dau.
- Reload tab khi upload dang pause van thay session trong IndexedDB.
- Vuot 2000 chunk records thi cleanup/pause co thong bao, khong am tham lam day may user.

### 2.5. Backend idempotency va sync API

Can them backend de offline sync an toan:

- Entity moi: `IdempotencyRecord`.
- Migration moi trong Infrastructure.
- Service moi: `IIdempotencyService`.
- Middleware/filter doc header `Idempotency-Key`.
- API endpoint tuy chon:
  - `POST /api/v1/sync/actions` de batch sync.
  - Hoac giu tung endpoint hien co va dung chung idempotency middleware.

Bang `IdempotencyRecords`:

- `Key`, `UserId`, `RequestHash`, `Endpoint`, `Status`, `ResponseBody`, `CreatedAt`, `ExpiresAt`.
- Unique index `(UserId, Key)`.
- TTL/cleanup background job hoac cleanup trong seed/dev script.

Workflow write can uu tien idempotency:

- post create/share/delete.
- comment create.
- reaction set/remove.
- saved collection add/remove.
- friendship actions.
- chat send message.
- reel create/delete.
- profile update/avatar/cover update.

### 2.6. Realtime va Redis tam thoi

Vai tro Redis trong phase nay:

- Luu presence/session/realtime state tam thoi.
- Luu distributed cache va short-lived sync lock.
- Khong thay IndexedDB: IndexedDB la source local cua client khi offline; Redis la server-side cache tam thoi.

Khi client sync thanh cong:

- Backend ghi DB truoc.
- Invalidate cache lien quan trong Redis.
- Publish notification/chat/feed event qua SignalR.
- Client update action IndexedDB sang `completed`.

### 2.7. UI can co

Them UI nho, khong lam phien:

- Badge/offline indicator tren header khi offline.
- Toast: "Da luu tam, se dong bo khi co mang".
- Man hinh debug trong Settings: pending actions, failed actions, retry, discard.
- Admin/debug logs khong can hien cho user thuong neu chua can.

### 2.8. Tieu chi nghiem thu

- Tat mang, tao post/comment/reaction: UI optimistic, action vao IndexedDB.
- Bat mang lai: action sync thanh cong, status `completed`, DB co data.
- Refresh tab khi offline: pending actions van con.
- Backend nhan trung `Idempotency-Key` khong tao duplicate.
- IndexedDB khong vuot 1000 action/user va tu clear action cu hon 1 thang.
- Co unit test cho queue/sync engine va integration test cho idempotency.

## 3. Phase 2 - Admin `/admin`, RBAC level guard va whitelist/blacklist

### 3.1. Route admin rieng

Hien frontend da co cac page admin, can audit lai:

- `frontend/Facebook_Frontend/src/pages/Admin/*`
- router chinh trong frontend.
- `frontend/Facebook_Frontend/src/services/adminService.js`
- backend `AdminController` route `api/v1/admin`.

Yeu cau:

- Frontend route `/admin` la layout rieng, khong dung chung main Facebook shell.
- Cac route con:
  - `/admin`
  - `/admin/users`
  - `/admin/posts`
  - `/admin/reels`
  - `/admin/roles`
  - `/admin/security`
  - `/admin/localization`
  - `/admin/settings` neu can.
- Route guard:
  - Chua login: redirect `/login`.
  - Login nhung khong admin/RBAC level du: hien 403 page, khong render admin shell.
  - Admin API tra 403: clear admin state va hien toast/debug.

### 3.2. RBAC level guard backend

Hien `AdminController.CreateRole/UpdateRole/SetRolePermissions/SetUserRoles` chua chan theo cap role hien tai. Can them helper:

- `GetCurrentUserMaxRoleLevelAsync()`
- `CanManageRoleLevel(currentLevel, targetLevel)`
- `CanAssignRoles(currentLevel, roles)`
- `CanEditSystemRole(role)`

Quy tac de xuat:

- Super admin/system admin level 100 moi duoc tao/sua/gan role level 100.
- User co max level `L` chi duoc:
  - tao role co `Level < L`.
  - sua role co `role.Level < L`.
  - set permission cho role co `role.Level < L`.
  - gan role cho user khac voi tat ca role `Level < L`.
  - khong tu nang level cua chinh minh.
  - khong xoa/sua role `IsSystem = true`, tru khi co permission `roles.system.manage` va level 100.
- Khi request vi pham: tra 403 voi message ro, correlation id.

Files can cham:

- `backend/src/FacebookClone.API/Controllers/AdminController.cs`
- `backend/src/FacebookClone.Infrastructure/Seed/RbacSeeder.cs`
- `shared/contracts/localization-catalog.json` neu them message UI/toast.
- `frontend/Facebook_Frontend/src/pages/Admin/AdminRoles.jsx`
- `frontend/Facebook_Frontend/src/pages/Admin/AdminUsers.jsx`
- `frontend/Facebook_Frontend/src/services/adminService.js`

### 3.3. RBAC UI

Trong admin:

- Khi tao/sua role, input level phai co max = `currentUserMaxLevel - 1`.
- Role dropdown trong User Management chi hien role user hien tai duoc phep gan.
- Role cao hon/bang cap hien tai bi disabled kem tooltip ly do.
- Neu role la system role, nut delete/edit level bi khoa.
- Modal role permission chi hien permission user hien tai duoc phep cap.

### 3.4. Kiem tra whitelist/blacklist

Code hien co:

- `SecurityBlockEntry`
- `BlockListKind.Blacklist`, `BlockListKind.Whitelist`
- `SecurityBlockService.IsWhitelistedAsync`
- `SecurityBlockService.MatchBlacklistAsync`
- `PersistentBlockMiddleware`
- Redis/fallback cache qua `ICacheService`.

Can audit:

- Thu tu middleware trong `Program.cs`: auth -> persistent block -> authorization -> rate limiter.
- Whitelist co duoc check truoc blacklist/rate limit khong.
- Whitelist co bypass rate limit hay chi bypass blacklist? Can quy dinh ro.
- Admin UI `AdminSecurity.jsx` co cho tao whitelist chua hay moi block/unblock IP.
- Cache key `security:blocklist:active` nen dua ve `shared/contracts/constants.json`.
- Khi add/remove list, Redis cache invalidation da dung chua.

Quy tac de xuat:

- Whitelist IP/user/email:
  - khong bi blacklist tu dong.
  - co the duoc bypass mot so rate limit neu policy cho phep.
  - van phai qua authorization.
- Blacklist IP/user/email:
  - tra 403 truoc controller.
  - log security event.
  - neu user dang co SignalR connection thi disconnect/reject reconnect.
- Admin phai quan ly duoc:
  - target type: IP, user, email.
  - list kind: blacklist/whitelist.
  - reason.
  - expiresAt.
  - createdBy.
  - active/inactive.

### 3.5. Tests

Backend tests can co:

- Non-admin khong vao admin API.
- Admin level 50 khong tao role level 80/100.
- Admin level 80 khong gan role level 80/100 cho user khac.
- Super admin level 100 tao/sua/gan duoc role thap hon hoac bang theo policy.
- Whitelist entry duoc cache va invalidate khi remove.
- Blacklist user/IP bi middleware chan.

Frontend tests can co:

- `/admin` guard.
- Role dropdown chi hien role hop le.
- Disabled tooltip cho role khong duoc gan.
- Security form tao blacklist/whitelist.

## 4. Phase 3 - Seed data day du, co anh va quan he du lieu

### 4.1. Muc tieu seed

Seed phai lam DB test du du lieu de demo:

- 20-50 users.
- 80-150 posts.
- 20-40 reels.
- comment/reply/reaction phong phu.
- friendship graph nhieu trang thai.
- conversations/messages.
- saved collections.
- notifications.
- localization entries.
- roles/permissions/admin users.
- security blacklist/whitelist mau.

### 4.2. Nguon anh

Khong nen phu thuoc runtime vao download internet moi lan seed. De xuat:

- Dung URL anh public on dinh trong seed:
  - avatar: `https://i.pravatar.cc/150?img=N`
  - cover/post placeholder: `https://picsum.photos/seed/{seed}/...`
  - reel thumbnails: `https://picsum.photos/seed/reel-{id}/...`
- Neu can anh noi bo:
  - tao script `scripts/download_seed_assets.py` de download co cache vao `backend/src/FacebookClone.API/wwwroot/seed`.
  - seed chi tham chieu asset local neu da co.

### 4.3. Refactor seeders

Files hien co:

- `backend/src/FacebookClone.Infrastructure/Seed/UserSeeder.cs`
- `PostSeeder.cs`
- `FriendshipSeeder.cs`
- `InteractionSeeder.cs`
- `ChatSeeder.cs`
- `NotificationSeeder.cs`
- `RbacSeeder.cs`
- `LocalizationSeeder.cs`
- `SeedRunner.cs`

De xuat them:

- `SeedDataCatalog.cs`: data mau co cau truc.
- `MediaSeeder.cs`: tao media attachments cho post/reel neu entity ho tro.
- `SavedCollectionSeeder.cs`: tao collections va saved posts.
- `SecurityListSeeder.cs`: tao whitelist/blacklist demo.
- `RichUserSeeder.cs`: mo rong user seed nhieu profile.

Nguyen tac:

- Seed idempotent: chay lai khong duplicate.
- Dung email/key/slug stable de upsert.
- Khong xoa data user that trong dev neu khong co flag `--reset-seed`.
- Co mode:
  - `--seed`: upsert missing demo data.
  - `--seed --reset-demo`: xoa va tao lai demo data co gan flag `IsDemo` neu them duoc.

### 4.4. Seed RBAC

Mo rong `RbacSeeder`:

- `super_admin` level 100.
- `admin` level 80.
- `moderator` level 50.
- `content_admin` level 40.
- `support` level 30.
- `user` level 10.

Permission can day du:

- `dashboard.view`
- `users.view`, `users.manage`, `users.ban`, `users.delete`, `users.roles.assign`
- `roles.view`, `roles.manage`, `roles.system.manage`
- `posts.view`, `posts.manage`, `posts.delete`, `posts.restore`, `posts.ban_author`
- `reels.view`, `reels.manage`, `reels.delete`, `reels.restore`, `reels.ban_author`
- `security.view`, `security.manage`, `security.blacklist.manage`, `security.whitelist.manage`, `security.rate_limit.reset`
- `localization.view`, `localization.manage`
- `settings.manage`

### 4.5. Seed data noi dung

Users:

- Admin accounts:
  - `admin@fbclone.com` / `Admin@123`
  - `superadmin@fbclone.com` / `Admin@123`
- User accounts:
  - `alice@fbclone.com`, `bob@fbclone.com`, `carol@fbclone.com`, ...
  - Password dev chung: `123456`.

Posts:

- Mix privacy: public/friends/private.
- Mix type: normal/shared/media.
- Co share chain ngan de test modal share.
- Co post da delete/hidden de admin content moderation test.

Interactions:

- Reaction da dang: like/love/haha/wow/sad/angry.
- Comment thread 1-2 cap.
- Saved collection: "Friend", "Learning", "Videos", "Important".

Chat:

- Conversation 1-1 Alice/Bob, Alice/Carol.
- Messages da read/unread.
- Typing/realtime khong seed truc tiep nhung UI co data de mo chat.

Notifications:

- friend request.
- comment/reaction.
- shared post.
- admin moderation notice neu co.

Security:

- 1 blacklist IP mau inactive.
- 1 whitelist email/user mau.
- Khong seed active blacklist len account dev chinh.

### 4.6. Tests va validation seed

Them tests:

- Seed chay 2 lan khong duplicate.
- Admin account luon ton tai va khong bi ban/deleted.
- Rbac roles/permissions/user roles dung level.
- Demo users/posts/comments/reactions du so luong toi thieu.

Lenh validate:

```bash
npm run seed
npm run test:be
```

## 5. Thu tu trien khai de giam rui ro

1. Phase 2.4 whitelist/blacklist audit nho truoc, vi code da co san va rui ro thap.
2. Phase 2.2 RBAC level guard backend, them tests truoc khi sua UI.
3. Phase 2.3 RBAC UI dropdown/disabled state.
4. Phase 3 seed data rich, vi khong anh huong runtime neu idempotent.
5. Phase 1.1-1.2 IndexedDB contracts + storage layer.
6. Phase 1.3-1.4 sync engine + axios integration theo tung module, uu tien post/comment/reaction.
7. Phase 1.5 backend idempotency.
8. Phase 1.6 realtime/cache invalidation va UI sync status.

## 6. Rui ro va cach kiem soat

- Offline sync co the tao duplicate data neu thieu idempotency: phai lam `IdempotencyRecord` va unique constraints truoc khi enable rong.
- Optimistic UI co the lech server state: can snapshot/rollback va toast debug.
- RBAC sai co the leo thang quyen: backend guard bat buoc, frontend chi la UX.
- Seed data dung anh remote co the cham/404: seed nen luu URL stable hoac co script cache asset rieng.
- Redis mat ket noi khong duoc lam chet request: `CacheService` hien da fallback/log, tiep tuc giu nguyen tinh chat nay.
- IndexedDB day/loi private mode: offline layer phai degrade ve online-only va hien thong bao ro.

## 7. Definition of Done

### Offline/eventual consistency

- Co IndexedDB queue, sync engine, cleanup policy 1000 actions/30 ngay.
- Co IndexedDB upload chunk metadata, cleanup policy 2000 chunk records/30 ngay.
- Cac write action uu tien co `Idempotency-Key`.
- Mat mang, thao tac, refresh, bat mang lai van sync dung.
- Video post/reel upload chunk co the resume tu chunk chua hoan thanh sau khi mat mang/API loi/reload.
- Redis cache invalidation/realtime event chay sau khi DB commit.

### Admin/RBAC/security

- `/admin` la route rieng co guard.
- Backend chan tao/sua/gan role cao hon hoac bang cap hien tai theo policy.
- UI role assignment la dropdown/filter theo role duoc phep gan.
- Whitelist va blacklist quan ly duoc trong admin, cache Redis va invalidate dung.
- Co tests cho RBAC escalation va block/allow list.

### Seed data

- DB dev co du data de test feed, profile, admin, post, reel, chat, notification, saved collections.
- Seed idempotent, chay lai khong duplicate.
- Co anh/avatar/cover/post/reel mau phong phu.
- Admin/super admin/dev users co credentials ro trong README hoac docs dev.

## 8. Lenh lien quan

```bash
npx gitnexus analyze
npm run db:up
npm run seed
npm run dev
npm run test
python scripts/generate_shared_contracts.py
```
