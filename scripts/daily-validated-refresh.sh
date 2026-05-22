#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/home/aerins/.openclaw/workspace/energy-pulse-uk"
LOCK_FILE="/tmp/energy-mix-daily-validated-refresh.lock"
LOG_PREFIX="[energy-mix-refresh]"

cd "$REPO_DIR"

if ! flock -n 9; then
  echo "$LOG_PREFIX another refresh is already running"
  exit 0
fi 9>"$LOCK_FILE"

echo "$LOG_PREFIX started at $(date -Is)"

git fetch origin main
git merge --ff-only origin/main

npm run build

git add \
  public/sitemap.xml \
  public/data/validation/latest.json \
  src/data/energyMixGenerated.json \
  src/data/staticGridSnapshot.json

if git diff --cached --quiet; then
  echo "$LOG_PREFIX no generated data changes to publish"
  exit 0
fi

refresh_date="$(node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync('public/data/validation/latest.json','utf8')); process.stdout.write(j.date || new Date().toISOString().slice(0,10));")"

git commit -m "Refresh Energy Mix daily data ${refresh_date}"
git push origin main

echo "$LOG_PREFIX published validated daily data for ${refresh_date}"
