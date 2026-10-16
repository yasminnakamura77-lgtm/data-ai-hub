#!/usr/bin/env bash
set -e
merged_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$merged_root"
for command_name in node pnpm uv python3; do
  command -v "$command_name" >/dev/null || { echo "Missing: $command_name"; exit 1; }
done
if [ ! -f ../../../pilgrims-core-components/packages/config/dist/vite-preset.js ]; then
  echo 'Missing ../../../pilgrims-core-components/packages/config/dist/vite-preset.js.'
  echo 'See README_MERGED.md for the required shared checkout.'
  exit 1
fi
if [ ! -d node_modules ]; then pnpm install; fi
if [ ! -f governance-api/.env ]; then cp governance-api/.env.example governance-api/.env; fi
merged_pids=()
cleanup() { for merged_pid in "${merged_pids[@]}"; do kill "$merged_pid" 2>/dev/null || true; done; }
trap cleanup EXIT
python3 dev-api/serve.py &
merged_pids+=("$!")
(cd governance-api && exec uv run uvicorn main:app --port 8000) &
merged_pids+=("$!")
pnpm dev -- --open &
merged_pids+=("$!")
echo 'Merged Hub: http://localhost:5175'
wait
