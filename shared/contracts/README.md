# Shared Contracts — Single Source of Truth

Canonical definitions shared by **backend (C#)** and **frontend (JS)**. Edit the
JSON here, then regenerate. Never hand-edit generated files.

## Files

| Contract | Generates |
|----------|-----------|
| `enums.json` | `backend/.../Domain/Enums/Generated/Enums.g.cs` + `StringConstants.g.cs` (namespace `FacebookClone.Domain.Enums`) and `frontend/.../src/shared/generated/enums.js` |
| `constants.json` | `frontend/.../src/shared/generated/constants.js` |

The backend enums live in the **same namespace** as before, so all existing C#
references keep working — the generated files simply replace the old hand-written
`Domain/Enums/*.cs` (now deleted).

## Workflow

```bash
# after editing a contract:
python scripts/generate_shared_contracts.py       # (python3 also works)

# CI / pre-commit drift guard (non-zero exit if stale):
python scripts/generate_shared_contracts.py --check
```

## Rules

- Enum values MUST stay in sync with the DB — changing a number is a breaking change.
- Add a new enum member? Edit `enums.json`, regenerate, rebuild BE + FE.
- Frontend imports: `import { PostPrivacy } from "@/shared/generated/enums"` (or relative path).
