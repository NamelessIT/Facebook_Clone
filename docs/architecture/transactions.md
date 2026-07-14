# Transactions & Idempotency

## Transaction boundaries

Multi-write flows run inside a single DB transaction (commit-all-or-nothing).
Use `IUnitOfWork.ExecuteInTransactionAsync(...)` at the Application-service layer
(it reuses the scoped `AppDbContext`, so repository `SaveChanges` calls join the
transaction; nested calls reuse the open transaction).

| Flow | Status |
|------|--------|
| Auth login (issue refresh token) | ✅ `AuthService.LoginAsync` (explicit tx) |
| Auth refresh-token rotation (revoke old + issue new) | ✅ `AuthService.RefreshTokenAsync` (explicit tx) |
| Auth logout / logout-all (revoke) | ✅ idempotent (early-return if already revoked) |
| Friend request (friendship + notification) | ✅ `FriendshipService.SendFriendRequestAsync` (IUnitOfWork) |
| Post create + media + notification | ⏳ follow-up — wrap in IUnitOfWork |
| Comment / reaction / share / save collection | ⏳ follow-up |
| Chat: create conversation + members + first message | ⏳ follow-up |
| Reels / upload complete | ⏳ follow-up |
| Admin ban/unban/block/unblock | ⏳ follow-up |

Pattern to apply to the follow-ups:

```csharp
await _unitOfWork.ExecuteInTransactionAsync(async () =>
{
    await _repoA.AddAsync(a);
    await _repoB.AddAsync(b);
    await _notiService.CreateNotificationAsync(...);
});
```

## Idempotency

- Logout is idempotent (safe to retry).
- Business uniqueness that enforces idempotency (reaction 1/user/post, friendship
  pair, saved-collection item, reel like) should be backed by **unique constraints**.
  Adding/verifying these requires an EF migration (`dotnet ef migrations add ...`).
- Optional next step: an idempotency-key header for POST write endpoints so client
  retries/double-clicks don't create duplicates (complements the FE single-flight
  hook from Phase 4).

## Outbox (future)

Side effects (realtime hub push, email) are currently invoked inline. For
stronger guarantees, write an outbox row inside the transaction and publish after
commit with a background retry.
