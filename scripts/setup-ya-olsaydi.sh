#!/usr/bin/env bash
# Tuhaf Tahsin bölüm üretimi için gereken araçları kurar. Tekrar çalıştırmak güvenli.
#   scripts/setup-ya-olsaydi.sh
set -euo pipefail
python3 -c "import numpy, PIL, playwright" 2>/dev/null || pip install -q playwright numpy Pillow
# Chromium hazır kurulu; "playwright install" çalıştırma. Render için: CHROME=/opt/pw-browsers/chromium
[ -x /opt/pw-browsers/chromium ] || { echo "Chromium yok: /opt/pw-browsers/chromium" >&2; exit 1; }
command -v ffmpeg >/dev/null || pip install -q imageio-ffmpeg
echo "Hazır: python paketleri, Chromium, ffmpeg"
