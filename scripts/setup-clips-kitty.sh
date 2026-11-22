#!/usr/bin/env bash
# Install Clips Kitty (https://github.com/ColinGPT9/clips-studio) and Ollama with its
# model on demand and,
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

# --- Ollama (local LLM that picks the clips) ---------------------------------
# Binary from GitHub releases; models need registry.ollama.ai and ollama.com on
# the environment's network allowlist (the "nuxtjs" environment has them).
OLLAMA_DIR="${OLLAMA_DIR:-$(dirname "$REPO_ROOT")/ollama}"
OLLAMA="$OLLAMA_DIR/bin/ollama"
MODEL="${CK_MODEL:-gemma:7b}"   # Clips Kitty's tested default
export OLLAMA_MODELS="${OLLAMA_MODELS:-$OLLAMA_DIR/models}"

if [ ! -x "$OLLAMA" ]; then
  echo "Installing Ollama into $OLLAMA_DIR"
  mkdir -p "$OLLAMA_DIR"
  curl -fsSL -o "$OLLAMA_DIR/ollama.tar.zst" \
    https://github.com/ollama/ollama/releases/latest/download/ollama-linux-amd64.tar.zst
  # No zstd CLI in the base image: unpack with Python's zstandard.
  "$UV" pip install -q -p "$PY" zstandard
  "$PY" - "$OLLAMA_DIR" <<'PYEOF'
import sys, tarfile, zstandard
d = sys.argv[1]
with open(f"{d}/ollama.tar.zst", "rb") as f, zstandard.ZstdDecompressor().stream_reader(f) as r:
    tarfile.open(fileobj=r, mode="r|").extractall(d, filter="data")
PYEOF
  rm -f "$OLLAMA_DIR/ollama.tar.zst"
fi

if ! curl -sf http://127.0.0.1:11434/api/version >/dev/null; then
  nohup "$OLLAMA" serve >"$OLLAMA_DIR/serve.log" 2>&1 &
  for _ in $(seq 1 30); do
    curl -sf http://127.0.0.1:11434/api/version >/dev/null && break
    sleep 1
  done
fi
if ! "$OLLAMA" list | awk 'NR>1{print $1}' | grep -qx "$MODEL"; then
  echo "Pulling $MODEL (several GB the first time)"
  "$OLLAMA" pull "$MODEL" >/dev/null 2>&1 \
    || { echo "Could not pull $MODEL: is registry.ollama.ai allowed on this network?" >&2; exit 1; }
fi
echo "Ollama ready with $MODEL"

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
