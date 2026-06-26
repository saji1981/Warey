#!/usr/bin/env python3
"""
Semantic version bumper — driven by Conventional Commits.

Reads git log since the last tag, determines the bump type,
then writes the new version into apps/mobile/app.json and
apps/mobile/package.json.

Bump rules (first matching rule wins):
  MAJOR  → any commit whose type ends in  !   e.g. feat!: ...
           OR a commit body/footer containing "BREAKING CHANGE:"
  MINOR  → feat:  (new feature, backwards-compatible)
  PATCH  → fix: | perf: | refactor: | docs: | chore: | ci: | build: | test:
  PATCH  → (default when no conventional-commit prefix is found)

Usage (GitHub Actions):
  python scripts/bump-version.py
  # Writes version=X.Y.Z to $GITHUB_OUTPUT
"""

import json, os, re, subprocess, sys
from pathlib import Path

ROOT     = Path(__file__).resolve().parent.parent
APP_JSON = ROOT / "apps" / "mobile" / "app.json"
PKG_JSON = ROOT / "apps" / "mobile" / "package.json"


# ── helpers ───────────────────────────────────────────────────────────────────
def git(*args: str) -> str:
    r = subprocess.run(["git"] + list(args), capture_output=True, text=True, cwd=ROOT)
    return r.stdout.strip()


def set_output(key: str, value: str) -> None:
    """Write to GITHUB_OUTPUT (new format) and echo for local runs."""
    print(f"::set-output name={key}::{value}")
    gho = os.environ.get("GITHUB_OUTPUT")
    if gho:
        with open(gho, "a") as f:
            f.write(f"{key}={value}\n")


# ── 1. Collect commits since the last tag ────────────────────────────────────
last_tag = git("describe", "--tags", "--abbrev=0", "--match", "v*")
if last_tag:
    log = git("log", f"{last_tag}..HEAD", "--pretty=format:%s%n%b%n---")
    print(f"Analysing commits since {last_tag}")
else:
    log = git("log", "--pretty=format:%s%n%b%n---")
    print("No previous tag — analysing all commits")

if not log.strip():
    print("No new commits since last tag; defaulting to patch bump.")
    log = ""


# ── 2. Determine bump type ────────────────────────────────────────────────────
MAJOR_RE  = re.compile(r'^(feat|fix|refactor|perf|chore|docs|ci|build|test)(\([^)]*\))?!:', re.I)
FEAT_RE   = re.compile(r'^feat(\([^)]*\))?:', re.I)
PATCH_RE  = re.compile(r'^(fix|perf|refactor|docs|chore|ci|build|test)(\([^)]*\))?:', re.I)

bump = "patch"
reasons: list[str] = []

for line in log.splitlines():
    line = line.strip()
    if not line or line == "---":
        continue
    if MAJOR_RE.match(line) or line.startswith("BREAKING CHANGE:"):
        bump = "major"
        reasons.append(f"MAJOR  ← {line[:80]}")
        break                          # can't go higher than major
    if FEAT_RE.match(line) and bump != "major":
        bump = "minor"
        reasons.append(f"MINOR  ← {line[:80]}")
    elif PATCH_RE.match(line) and bump == "patch":
        reasons.append(f"PATCH  ← {line[:80]}")

if not reasons:
    reasons = ["PATCH  ← (no conventional-commit prefix found — defaulting to patch)"]

print("\nBump decisions:")
for r in reasons[:10]:
    print(f"  {r}")
print(f"\nFinal bump type: {bump.upper()}")


# ── 3. Read current version ───────────────────────────────────────────────────
with open(APP_JSON) as f:
    app = json.load(f)

current = app["expo"]["version"]
try:
    major, minor, patch_num = map(int, current.split("."))
except ValueError:
    print(f"ERROR: could not parse version '{current}' in app.json", file=sys.stderr)
    sys.exit(1)


# ── 4. Compute new version ────────────────────────────────────────────────────
if bump == "major":
    new_version = f"{major + 1}.0.0"
elif bump == "minor":
    new_version = f"{major}.{minor + 1}.0"
else:
    new_version = f"{major}.{minor}.{patch_num + 1}"

print(f"\nVersion bump: {current}  →  {new_version}")


# ── 5. Write apps/mobile/app.json ────────────────────────────────────────────
app["expo"]["version"] = new_version
with open(APP_JSON, "w", encoding="utf-8") as f:
    json.dump(app, f, indent=2, ensure_ascii=False)
    f.write("\n")
print(f"Updated {APP_JSON.relative_to(ROOT)}")


# ── 6. Write apps/mobile/package.json ────────────────────────────────────────
with open(PKG_JSON, encoding="utf-8") as f:
    pkg = json.load(f)
pkg["version"] = new_version
with open(PKG_JSON, "w", encoding="utf-8") as f:
    json.dump(pkg, f, indent=2, ensure_ascii=False)
    f.write("\n")
print(f"Updated {PKG_JSON.relative_to(ROOT)}")


# ── 7. Expose output to GitHub Actions ───────────────────────────────────────
set_output("version", new_version)
set_output("bump_type", bump)
