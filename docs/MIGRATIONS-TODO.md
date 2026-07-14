# Pending EF Migrations

These schema changes were implemented **code-only** (entity + DbContext config)
because the dev environment blocked EF tooling / running freshly-built DLLs
during that session. Generate + apply them on a machine where EF works.

## 1. Security block/allow lists (Phase 7)

New entity `SecurityBlockEntry` + `DbSet<SecurityBlockEntry>` +
`SecurityBlockEntryConfiguration`. Until the migration is applied, the admin
block-list endpoints and `PersistentBlockMiddleware` will fail at runtime
(missing table).

```bash
cd backend
dotnet ef migrations add AddSecurityBlockList \
  --project src/FacebookClone.Infrastructure \
  --startup-project src/FacebookClone.API
# then just run the API (Database__AutoMigrate=true applies it), or:
dotnet ef database update \
  --project src/FacebookClone.Infrastructure \
  --startup-project src/FacebookClone.API
```

## 2. Phase 8 idempotency constraints (if added later)

Any new unique constraints for idempotency (e.g. reaction-per-user-per-post,
friendship pair) that aren't already enforced should get their own migration
the same way. Transaction wrapping (Phase 8) needs **no** migration.

## Verify

After generating, confirm no drift:

```bash
dotnet ef migrations has-pending-model-changes \
  --project src/FacebookClone.Infrastructure \
  --startup-project src/FacebookClone.API   # -> "No changes"
```
