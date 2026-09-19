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
    time.sleep(1.5)
    print("Running Playwright capture script...")
    env = {
        **subprocess.os.environ,
        "NODE_PATH": "/home/noxin/.local/share/mise/installs/npm-playwright/latest/node_modules"
    }
    subprocess.run(["node", "scripts/capture_screenshots.js"], env=env, check=True)
    print("Screenshots captured successfully.")

finally:
    proc.terminate()
    try:
        proc.wait(timeout=2)
    except subprocess.TimeoutExpired:
        proc.kill()
