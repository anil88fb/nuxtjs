#!/usr/bin/env bash
# Açık kaynak nota tanıma motoru homr'u (https://github.com/liebharc/homr)
# proje klasöründeki .venv-omr sanal ortamına kurar ve modelleri indirir.
# Gereksinim: Python 3.10+
set -euo pipefail
cd "$(dirname "$0")/.."

python3 -m venv .venv-omr
./.venv-omr/bin/pip install --quiet --upgrade pip
./.venv-omr/bin/pip install --quiet homr onnxruntime
./.venv-omr/bin/homr --init

echo "homr kuruldu: $(pwd)/.venv-omr/bin/homr"
