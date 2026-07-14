# Codebase Baseline Audit

_Generated: 2026-07-14 (Phase 0 of the upgrade plan)._

## Repo layout

```
Facebook_Clone/
├── backend/               ASP.NET Core 9 solution (FacebookClone.sln)
│   └── src/
│       ├── FacebookClone.API              (controllers, hubs, middleware, DI)
│       ├── FacebookClone.Application      (services, DTOs, mappings)
│       ├── FacebookClone.Domain           (entities, enums, interfaces)
│       └── FacebookClone.Infrastructure   (EF Core, repositories, migrations, seed)
├── frontend/Facebook_Frontend/            React 19 + Vite 7
├── docker-compose.yml                     PostgreSQL 16
├── package.json                           root scripts (dev/build/lint/test)
├── .env / .env.example                    backend + docker config
└── docs/                                  docs + this audit
```

## Inventory (as of baseline)

| Area | Count |
|------|-------|
| Backend .cs files (excl. bin/obj) | 190 |
| Controllers | 13 |
| Application services | 12 |
| Repositories | 10 |
| Domain entities | 18 |
| Domain enums | 11 |
| EF migrations | 9 |
| Frontend services | 10 |
| Frontend pages | 19 |
| Frontend components | 32 |

GitNexus index (from `npx gitnexus analyze`): 2,672 nodes · 5,526 edges · 116 clusters · 214 flows.

## Current-state risks (drive later phases)

| # | Risk | Phase |
|---|------|-------|
| R1 | API base URL / hub URLs / port were hardcoded in multiple FE files | 0 (fixed → `src/config/env.js`) |
| R2 | Enums/constants duplicated across FE and BE (no single source of truth) | 1 |
| R3 | Rate limiting only in-memory `SecurityService`; no ASP.NET rate-limit middleware, no per-module policy | 2 |
| R4 | JWT secret + DB password committed in `appsettings.json`; tokens stored in `localStorage` | 5 |
| R5 | No FluentValidation / request-validation filters; limited payload/file guards | 5 |
| R6 | No backend test project; no Vitest/Playwright; no CI pipeline | 3 |
| R7 | Write buttons lack consistent debounce/single-flight → double-submit risk | 4 |
| R8 | No Redis/distributed cache; presence + rate limit not shareable across instances | 6 |
| R9 | IP/user block list is in-memory in a singleton → lost on restart | 7 |
| R10 | Multi-write flows (auth token rotation, post+media+notification, friend accept) may lack explicit transactions/idempotency | 8 |
| R11 | A migration (`AddAdminAndBanFields`) had shipped without a `.Designer.cs`, so it never applied | 0 (fixed → regenerated) |

## Fixed in Phase 0

- Central FE config `src/config/env.js` (reads `VITE_*`, safe fallbacks); removed hardcoded `localhost:5286` from `axiosClient`, `chatService`, `notificationService`, `formatUrl`.
- Root `package.json` — `npm run dev` runs backend (`dotnet watch`) + frontend (Vite) together via `concurrently`.
- `.env` / `.env.example` at root (backend + docker) and `frontend/.env.example`.
- Backend auto-migrate + auto-seed on startup (`.env`: `Database__AutoMigrate`, `Database__AutoSeed`); expanded seed data.
- Regenerated the broken `AddAdminAndBanFields` migration (missing Designer) so schema bootstrap works end-to-end.

## How to run (one command)

```bash
npm install                 # root (installs concurrently)
npm run install:fe          # frontend deps
docker compose up -d        # PostgreSQL
npm run dev                 # backend + frontend together
```

Backend: http://localhost:5286 (Swagger at `/swagger`) · Frontend: http://localhost:5173
