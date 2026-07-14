# API Security Checklist

_Endpoint-by-endpoint security review. Updated during Phase 5 of the upgrade plan._

## Authentication / Authorization

| Controller | `[Authorize]` | Notes |
|-----------|:-------------:|-------|
| AuthController | partial | login/register/refresh are anonymous (by design); logout/me require auth. Auth rate-limit policy applied. |
| UserController | ✅ | |
| PostsController | ✅ | write rate-limit policy; GET reads exempted |
| PostInteractionController | ✅ | |
| SavedCollectionController | ✅ | |
| FriendshipsController | ✅ | |
| ChatController | ✅ | + SignalR hub token via query string |
| NotificationsController | ✅ | |
| ReelsController | ✅ | |
| GroupsController | ✅ | |
| SearchController | ✅ | search rate-limit policy |
| MediaController | ✅ | one `[AllowAnonymous]` endpoint (static/media fetch) — verify no private media leak |
| AdminController | ✅ + `IsAdmin` | every action re-checks `user.IsAdmin`; cannot ban/delete an admin |

### Findings / roadmap
- **F1 (medium):** Admin authorization is enforced by a per-action `if (!user.IsAdmin)` lookup. Works, but easy to forget on new endpoints. Roadmap: add an `Admin` authorization policy + `IsAdmin` claim in the JWT, or a reusable admin filter.
- **F2 (medium):** Object-level authorization exists for posts (`PostOwnerFilter`). Audit remaining owner-scoped resources: profile privacy, saved collections, conversation membership, group roles.
- **F3 (high, roadmap):** Tokens are stored in `localStorage` (XSS-exposed). Roadmap: move refresh token to httpOnly secure cookie on deploy; rotate + revoke in a transaction (Phase 8).

## Transport / headers

| Control | Status |
|---------|--------|
| Security headers (`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `X-Permitted-Cross-Domain-Policies`) | ✅ `SecurityHeadersMiddleware` |
| HSTS / HTTPS redirection | ⏳ enable in Production (currently off for local dev) |
| CSP | ⏳ add per-env (balanced with Vite assets) |
| CORS whitelist | ✅ from config `Cors:AllowedOrigins` (env-overridable), no wildcard with credentials |

## Input validation

| Control | Status |
|---------|--------|
| DTO validation (FluentValidation / filters) | ⏳ roadmap — add for auth/post/comment/group DTOs |
| Upload limits (size/type/extension/content-type) | ⚠️ partial in MediaService — centralize + enforce |
| Output/input sanitization (XSS / path traversal) | ⏳ review media path handling + rich text |

## Rate limiting / abuse

| Control | Status |
|---------|--------|
| Global + per-module rate limits (429 + Retry-After) | ✅ Phase 2 |
| IP block / suspicious payload inspection | ✅ `SecurityMiddleware` (in-memory) |
| Persistent block/allow lists (IP/user/email) | ✅ code (`SecurityBlockEntry` + `PersistentBlockMiddleware` + admin API, Redis-cached). ⚠️ **Requires a migration** — `dotnet ef migrations add AddSecurityBlockList --project src/FacebookClone.Infrastructure --startup-project src/FacebookClone.API`. |

## Secrets

| Control | Status |
|---------|--------|
| Secrets via `.env` / env vars (gitignored) | ✅ |
| Production guard: reject placeholder `Jwt:Secret` | ✅ fail-fast in Program.cs |
| DB password / JWT secret out of committed prod config | ✅ `.env` (dev placeholder only in appsettings) |
| Secret scanning in CI | ⏳ Phase 3 |
| Audit/correlation logs exclude secrets/tokens/passwords | ✅ correlation id middleware; verify no token logging |
