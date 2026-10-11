#!/usr/bin/env bash
# Bring the server up to the newest main, rebuilding the containers only when the website changed.
set -euo pipefail

cd "$(dirname "$0")/.."

# Do nothing if an earlier update is still running.
exec 9>/tmp/aurora-deploy.lock
flock -n 9 || exit 0

git fetch --quiet origin main
target=$(git rev-parse origin/main)
marker=.deployed
current=$(cat "$marker" 2>/dev/null || echo none)
[ "$current" = "$target" ] && exit 0

git merge --ff-only --quiet origin/main
if [ "$current" != none ] && git diff --quiet "$current" "$target" -- api web compose.prod.yaml; then
  echo "$(date -Is) now at ${target:0:7}, nothing to rebuild"
else
  docker compose -f compose.prod.yaml up --build -d
  echo "$(date -Is) deployed ${target:0:7}"
fi

# Written last, so a failed build is tried again on the next run.
echo "$target" > "$marker"
