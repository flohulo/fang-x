#!/usr/bin/env bash
# Führt vor jedem `git push` Typecheck und Client-Build aus; bei Fehler wird der Push blockiert.
input=$(cat)
command=$(printf '%s' "$input" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).tool_input.command||"")}catch{console.log("")}})')
case "$command" in
  *"git push"*) ;;
  *) exit 0 ;;
esac
cd "$CLAUDE_PROJECT_DIR" || exit 0
if ! out=$(npm run typecheck 2>&1 && npm run build 2>&1); then
  printf 'Push blockiert: Typecheck oder Build fehlgeschlagen.\n%s\n' "$(printf '%s' "$out" | tail -30)" >&2
  exit 2
fi
