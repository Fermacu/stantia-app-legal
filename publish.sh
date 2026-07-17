#!/usr/bin/env bash
# One-time setup: publish hybrd-legal and lock down the hybrd code repo.
# Requires: GitHub CLI (`brew install gh`) and `gh auth login`.

set -euo pipefail

LEGAL_DIR="$(cd "$(dirname "$0")" && pwd)"
HYBRD_DIR="$(cd "$LEGAL_DIR/../hybrd" && pwd)"

export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

if ! command -v gh >/dev/null 2>&1; then
  echo "Install GitHub CLI first: brew install gh"
  echo "Then: gh auth login"
  exit 1
fi

gh auth status

cd "$LEGAL_DIR"

if ! gh repo view Fermacu/hybrd-legal >/dev/null 2>&1; then
  gh repo create Fermacu/hybrd-legal --public --source=. --remote=origin --push \
    --description "Public Privacy Policy and Terms for HYBRD"
else
  if ! git remote get-url origin >/dev/null 2>&1; then
    git remote add origin "https://github.com/Fermacu/hybrd-legal.git"
  fi
  git push -u origin main
fi

# Enable GitHub Pages from root of main
gh api -X POST "repos/Fermacu/hybrd-legal/pages" \
  -f build_type=legacy \
  -f source[branch]=main \
  -f source[path]=/ \
  2>/dev/null || \
gh api -X PUT "repos/Fermacu/hybrd-legal/pages" \
  -f build_type=legacy \
  -f source[branch]=main \
  -f source[path]=/ \
  2>/dev/null || true

echo ""
echo "Legal site: https://fermacu.github.io/hybrd-legal/privacy/"
echo "(Pages can take 1–2 minutes the first time.)"
echo ""

read -r -p "Make Fermacu/hybrd PRIVATE now? [y/N] " ans
if [[ "${ans:-}" =~ ^[Yy]$ ]]; then
  # Disable Pages on hybrd if still enabled
  gh api -X DELETE "repos/Fermacu/hybrd/pages" 2>/dev/null || true
  gh repo edit Fermacu/hybrd --visibility private --accept-visibility-change-consequences
  echo "hybrd is now private."
else
  echo "Skipped. Later: gh repo edit Fermacu/hybrd --visibility private --accept-visibility-change-consequences"
  echo "Also disable Pages on hybrd: Settings → Pages → None"
fi
