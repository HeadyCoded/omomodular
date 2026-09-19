import json
import subprocess
import time
from pathlib import Path

from omomodular.config import load
from omomodular.presets import FACTORY_PRESETS

cfg = load()

# 1. Save Acid Techno preset to state.json
preset = FACTORY_PRESETS["★ 808 & 303 Acid Techno Jam"]
cfg.state_file.write_text(json.dumps(preset, indent=2))
print("Wrote 808 & 303 Acid Techno Jam preset to state.json")

# 2. Start server
proc = subprocess.Popen(
    ["./.venv/bin/python", "-m", "uvicorn", "omomodular.server:create_app", "--factory", "--host", "127.0.0.1", "--port", "8796", "--log-level", "warning"],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL
)

try:
    time.sleep(1.0)
    print("Capturing ui_acid_techno.png...")
    subprocess.run([
        "/usr/bin/chromium",
        "--headless",
        "--disable-gpu",
        "--hide-scrollbars",
        "--screenshot=ui_acid_techno.png",
        "--window-size=1600,1050",
        "--virtual-time-budget=2500",
        "http://127.0.0.1:8796/"
    ], check=True)
    print("Captured ui_acid_techno.png successfully")

finally:
    proc.terminate()
    try:
        proc.wait(timeout=2)
    except subprocess.TimeoutExpired:
        proc.kill()
