import json
import subprocess
import time
from pathlib import Path

from omomodular.config import load
from omomodular.presets import FACTORY_PRESETS

cfg = load()

# 1. Set preset to Daft Modular Funk
preset = FACTORY_PRESETS["★ Daft Modular Funk (MIDI Live)"]
cfg.state_file.write_text(json.dumps(preset, indent=2))
print("Wrote Daft Modular Funk preset to state.json")

# 2. Start server on 8797
proc = subprocess.Popen(
    ["./.venv/bin/python", "-m", "uvicorn", "omomodular.server:create_app", "--factory", "--host", "127.0.0.1", "--port", "8797", "--log-level", "warning"],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL
)

try:
    time.sleep(1.2)
    print("Capturing ui_midi_preset.png...")
    subprocess.run([
        "/usr/bin/chromium",
        "--headless",
        "--disable-gpu",
        "--hide-scrollbars",
        "--screenshot=ui_midi_preset.png",
        "--window-size=1600,1050",
        "--virtual-time-budget=3000",
        "http://127.0.0.1:8797/"
    ], check=True)
    print("Captured ui_midi_preset.png successfully")

finally:
    proc.terminate()
    try:
        proc.wait(timeout=2)
    except subprocess.TimeoutExpired:
        proc.kill()
