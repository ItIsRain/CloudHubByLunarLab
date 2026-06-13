#!/usr/bin/env bash
#
# Production deploy for CloudHub.
#
# What changed vs. the previous deploy.sh:
#   1. `npm run build` now also runs scripts/fix-standalone.mjs, which copies
#      .next/static, public/, and (critically) every *_client-reference-
#      manifest.js into .next/standalone. Without those manifests, Next
#      throws `Invariant: The client reference manifest for route "/X" does
#      not exist` and PM2 restart-loops — exactly the prod symptom.
#   2. Failsafe static/public copies use `cp -rT` so re-runs don't nest into
#      `static/static/` / `public/public/`.
#   3. PM2 invocation uses `reload` instead of stop + delete + start, so an
#      existing worker keeps serving traffic while the new one warms up
#      (zero-downtime). `--update-env` makes the new env vars take effect.
#   4. cwd is pinned via PM2 so the standalone server resolves relative
#      paths the same way regardless of where the script is invoked from.

set -euo pipefail

APP_DIR=/var/www/CloudHubByLunarLab
APP_NAME=cloudhub
APP_PORT=3002

cd "$APP_DIR"

echo "==> Pulling latest from origin/main..."
git fetch origin
git reset --hard origin/main

echo "==> Installing dependencies..."
# npm ci is faster + reproducible when package-lock is in sync. Falls back
# to install if the lockfile has drifted (e.g. dev added a dep without
# committing the lockfile).
npm ci || npm install

echo "==> Building..."
npm run build

echo "==> Running standalone fixer (mirrors .next/server + .next/static + public)..."
# Explicit invocation so even if package.json's `build` script wasn't yet
# updated to chain the fixer, we still get the missing manifest copies +
# 500.html stub. Idempotent — safe to re-run.
if [ -f scripts/fix-standalone.mjs ]; then
  node scripts/fix-standalone.mjs
else
  echo "WARN — scripts/fix-standalone.mjs not in repo; falling back to manual copies."
  mkdir -p .next/standalone/.next/static
  cp -rT .next/static .next/standalone/.next/static
  mkdir -p .next/standalone/public
  cp -rT public .next/standalone/public
  mkdir -p .next/standalone/.next/server
  cp -rT .next/server .next/standalone/.next/server
fi

echo "==> Wiring runtime env..."
# The standalone server runs from its own subtree and does NOT inherit
# .env.local from the project root. Copy it in fresh on every deploy.
cp .env.local .next/standalone/.env.local

echo "==> Restarting PM2 (clean stop + start)..."
# A `pm2 reload` of an already-crashing worker just hot-swaps the same
# busted process; do a hard stop + delete + start so we know the new
# binaries are picked up cleanly.
pm2 stop "$APP_NAME" >/dev/null 2>&1 || true
pm2 delete "$APP_NAME" >/dev/null 2>&1 || true

PORT="$APP_PORT" NODE_ENV=production pm2 start .next/standalone/server.js \
  --name "$APP_NAME" \
  --cwd "$APP_DIR" \
  --update-env

pm2 save

echo "==> Sanity check..."
sleep 3
http_status="$(curl -sSI -o /dev/null -w '%{http_code}' "http://localhost:${APP_PORT}" || echo 000)"
case "$http_status" in
  2*|3*)
    echo "OK — http://localhost:${APP_PORT} returned ${http_status}"
    ;;
  *)
    echo "WARN — http://localhost:${APP_PORT} returned ${http_status}"
    echo "       Tail logs: pm2 logs $APP_NAME --lines 50"
    exit 1
    ;;
esac

echo "==> Done."
