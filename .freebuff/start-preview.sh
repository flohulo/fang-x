#!/usr/bin/env bash
# Startet den Fang-X-Preview-Server (wrangler dev: API + WebSocket + gebaute PWA-Assets) detached.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$ROOT/.freebuff/preview.log"
PIDFILE="$ROOT/.freebuff/preview.pid"

cd "$ROOT/server"
rm -f "$LOG"
setsid nohup "$ROOT/node_modules/.bin/wrangler" dev --ip 0.0.0.0 --port 3000 \
  > "$LOG" 2>&1 < /dev/null &
echo $! > "$PIDFILE"
sleep 1
echo "started pid $(cat "$PIDFILE")"
