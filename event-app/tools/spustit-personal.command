#!/bin/zsh
set -eu
CREW_PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CREW_PYTHON_BIN="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3"
if [[ ! -x "$CREW_PYTHON_BIN" ]]; then
  CREW_PYTHON_BIN="$(command -v python3)"
fi
exec "$CREW_PYTHON_BIN" "$CREW_PROJECT_ROOT/event-app/tools/crew_workspace.py" --port 4317
