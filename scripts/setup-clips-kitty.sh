#!/usr/bin/env bash
# Install Clips Kitty (https://github.com/ColinGPT9/clips-studio) on demand and,
# with --serve, start its engine on 127.0.0.1:8765. Safe to run repeatedly.
#
#   scripts/setup-clips-kitty.sh           # install only
#   scripts/setup-clips-kitty.sh --serve   # install if needed, then start the engine
#
# CK_DIR overrides the install location (default: ../clips-kitty next to this repo).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CK_DIR="${CK_DIR:-$(dirname "$REPO_ROOT")/clips-kitty}"
PORT="${CK_PORT:-8765}"
PY="$CK_DIR/.venv/bin/python"

UV="$(command -v uv || true)"
[ -z "$UV" ] && [ -x "$HOME/.local/bin/uv" ] && UV="$HOME/.local/bin/uv"
if [ -z "$UV" ]; then
  pip install -q uv && UV="$(command -v uv)"
fi

if [ ! -d "$CK_DIR/.git" ]; then
  echo "Cloning Clips Kitty into $CK_DIR"
  git clone -q --depth 1 https://github.com/ColinGPT9/clips-studio "$CK_DIR"
fi

# Python 3.13 is too new for some pinned deps; 3.12 is what works.
if ! "$PY" -c "import torch, faster_whisper, fastapi" >/dev/null 2>&1; then
  echo "Installing Python dependencies (a few minutes the first time)"
  "$UV" venv -q --allow-existing -p 3.12 "$CK_DIR/.venv"
  "$UV" pip install -q -p "$PY" -r "$CK_DIR/requirements.txt"
fi
echo "Clips Kitty installed at $CK_DIR"

if [ "${1:-}" = "--serve" ]; then
  if curl -sf "http://127.0.0.1:$PORT/health" >/dev/null; then
    echo "Engine already running on 127.0.0.1:$PORT"
  else
    (cd "$CK_DIR" && nohup "$PY" main.py serve --port "$PORT" >"$CK_DIR/serve.log" 2>&1 &)
    for _ in $(seq 1 60); do
      curl -sf "http://127.0.0.1:$PORT/health" >/dev/null && break
      sleep 1
    done
    curl -sf "http://127.0.0.1:$PORT/health" >/dev/null \
      && echo "Engine running on 127.0.0.1:$PORT (log: $CK_DIR/serve.log)" \
      || { echo "Engine did not start; see $CK_DIR/serve.log" >&2; exit 1; }
  fi
fi
