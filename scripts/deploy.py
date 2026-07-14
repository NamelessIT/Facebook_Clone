#!/usr/bin/env python3
"""Deploy / release pipeline for Facebook Clone.

Runs on `python` and `python3`, including Git Bash on Windows. Each step logs
status + duration. Stops safely when required config/secrets are missing.

Usage:
    python scripts/deploy.py            # full pipeline
    python scripts/deploy.py --dry-run  # print steps, run only read-only checks
    python scripts/deploy.py --skip-tests

Pipeline: check env -> restore/install -> generate contracts -> lint -> test
          -> build -> docker compose build/up -> migrate -> health check.
"""
from __future__ import annotations
import argparse
import os
import shutil
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FE = ROOT / "frontend" / "Facebook_Frontend"
SLN = ROOT / "backend" / "FacebookClone.sln"
API_CSPROJ = ROOT / "backend" / "src" / "FacebookClone.API" / "FacebookClone.API.csproj"

# Env vars that MUST be present (via real env or .env) before a real deploy.
REQUIRED_ENV = ["ConnectionStrings__Default", "Jwt__Secret"]

# Colors only when stdout is a real terminal that isn't legacy Windows console.
_USE_COLOR = sys.stdout.isatty() and os.environ.get("TERM") not in (None, "")
C_OK = "\033[92m" if _USE_COLOR else ""
C_ERR = "\033[91m" if _USE_COLOR else ""
C_WARN = "\033[93m" if _USE_COLOR else ""
C_RESET = "\033[0m" if _USE_COLOR else ""

# Force UTF-8 so ASCII-safe output never trips a legacy code page.
try:
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
except Exception:
    pass


def log(msg: str, color: str = "") -> None:
    print(f"{color}{msg}{C_RESET}", flush=True)


def load_dotenv() -> None:
    """Minimal .env loader (no third-party deps)."""
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())


class Step:
    def __init__(self, name: str, dry_run: bool):
        self.name = name
        self.dry_run = dry_run

    def __enter__(self):
        self.t0 = time.time()
        prefix = "[DRY] " if self.dry_run else ""
        log(f"-> {prefix}{self.name} ...")
        return self

    def __exit__(self, exc_type, exc, tb):
        dt = time.time() - self.t0
        if exc_type is None:
            log(f"  [OK]   {self.name}  ({dt:.1f}s)", C_OK)
        else:
            log(f"  [FAIL] {self.name}  ({dt:.1f}s)", C_ERR)
        return False


def run(cmd: list[str], cwd: Path | None = None, dry_run: bool = False) -> None:
    if dry_run:
        log(f"    would run: {' '.join(cmd)}", C_WARN)
        return
    subprocess.run(cmd, cwd=cwd, check=True)


def require_tools(dry_run: bool) -> None:
    missing = [t for t in ("dotnet", "npm") if shutil.which(t) is None]
    if not dry_run and shutil.which("docker") is None:
        missing.append("docker")
    if missing:
        log(f"Missing required tools: {', '.join(missing)}", C_ERR)
        sys.exit(2)


def check_env(dry_run: bool) -> None:
    missing = [k for k in REQUIRED_ENV if not os.environ.get(k)]
    if missing:
        log(f"Missing required env: {', '.join(missing)}", C_ERR)
        log("Set them in .env or the environment before deploying.", C_ERR)
        if not dry_run:
            sys.exit(3)
        else:
            log("  (dry-run: continuing despite missing env)", C_WARN)


def bump_version(dry_run: bool) -> str:
    """Increment the patch version in root package.json (v1.0.0 -> v1.0.1) so each
    deploy is easy to identify. Returns the (new) version string."""
    import json as _json
    pkg_path = ROOT / "package.json"
    pkg = _json.loads(pkg_path.read_text(encoding="utf-8"))
    current = pkg.get("version", "0.0.0")
    try:
        major, minor, patch = (int(x) for x in current.split("."))
    except ValueError:
        major, minor, patch = 1, 0, 0
    new_version = f"{major}.{minor}.{patch + 1}"

    if dry_run:
        log(f"    would bump version: {current} -> {new_version}", C_WARN)
        return current

    pkg["version"] = new_version
    # Preserve 2-space indentation + trailing newline.
    pkg_path.write_text(_json.dumps(pkg, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    log(f"    version: {current} -> v{new_version}", C_OK)
    return new_version


def health_check(url: str, attempts: int = 20, delay: float = 3.0) -> bool:
    for i in range(attempts):
        try:
            with urllib.request.urlopen(url, timeout=3) as r:
                if r.status < 500:
                    return True
        except Exception:
            pass
        time.sleep(delay)
    return False


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--skip-tests", action="store_true")
    parser.add_argument("--no-bump", action="store_true", help="do not auto-increment the deploy version")
    parser.add_argument("--health-url", default="http://localhost:5286/swagger/index.html")
    args = parser.parse_args()
    dry = args.dry_run

    load_dotenv()
    log("=" * 56)
    log(f"Facebook Clone deploy  {'(DRY RUN)' if dry else ''}")
    log("=" * 56)

    require_tools(dry)

    with Step("Check required env/secrets", dry):
        check_env(dry)

    version = None
    if not args.no_bump:
        with Step("Bump deploy version", dry):
            version = bump_version(dry)

    with Step("Generate shared contracts (drift check)", dry):
        run([sys.executable, str(ROOT / "scripts" / "generate_shared_contracts.py"), "--check"], dry_run=False)

    with Step("Restore backend + install frontend", dry):
        run(["dotnet", "restore", str(SLN)], dry_run=dry)
        run(["npm", "ci"], cwd=FE, dry_run=dry)

    if not args.skip_tests:
        with Step("Test backend", dry):
            run(["dotnet", "test", str(SLN), "-c", "Release"], dry_run=dry)
        with Step("Lint + test frontend", dry):
            run(["npm", "run", "lint"], cwd=FE, dry_run=dry)
            run(["npm", "run", "test"], cwd=FE, dry_run=dry)

    with Step("Build backend + frontend", dry):
        run(["dotnet", "build", str(SLN), "-c", "Release"], dry_run=dry)
        run(["npm", "run", "build"], cwd=FE, dry_run=dry)

    with Step("Docker compose build + up", dry):
        run(["docker", "compose", "up", "-d", "--build"], cwd=ROOT, dry_run=dry)

    with Step("Apply database migrations (via app bootstrap)", dry):
        # The API applies migrations on startup (Database__AutoMigrate). --seed
        # forces migrate+seed then exits.
        run(["dotnet", "run", "--project", str(API_CSPROJ), "--", "--seed"], dry_run=dry)

    with Step("Health check", dry):
        if dry:
            log(f"    would poll: {args.health_url}", C_WARN)
        elif not health_check(args.health_url):
            log(f"Health check failed: {args.health_url}", C_ERR)
            return 4

    tag = f" (v{version})" if version else ""
    log(f"Deploy pipeline finished.{tag}" if not dry else "Dry run finished.", C_OK)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
