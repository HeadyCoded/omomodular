"""OmoModular entry point: launches the FastAPI server and Chromium app window."""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import urllib.request
from pathlib import Path

import uvicorn

from . import __version__, util
from .config import load as load_config
from .server import create_app

_BROWSERS = (
    "chromium",
    "chromium-browser",
    "google-chrome-stable",
    "google-chrome",
    "brave",
    "brave-browser",
)
_PROFILE_DIR = Path.home() / ".local/share/omomodular/browser"


def _find_windows_browser() -> str | None:
    """Search common Windows install locations (GUI apps rarely live on PATH)."""
    program_files = os.environ.get("ProgramFiles", r"C:\Program Files")
    program_files_x86 = os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")
    local_appdata = os.environ.get("LOCALAPPDATA", "")

    candidates = [
        Path(program_files) / "Google/Chrome/Application/chrome.exe",
        Path(program_files_x86) / "Google/Chrome/Application/chrome.exe",
        Path(program_files) / "BraveSoftware/Brave-Browser/Application/brave.exe",
        # Edge ships on every Windows 10/11 install -- the guaranteed fallback.
        Path(program_files) / "Microsoft/Edge/Application/msedge.exe",
        Path(program_files_x86) / "Microsoft/Edge/Application/msedge.exe",
    ]
    if local_appdata:
        candidates[1:1] = [
            Path(local_appdata) / "Google/Chrome/Application/chrome.exe",
            Path(local_appdata) / "BraveSoftware/Brave-Browser/Application/brave.exe",
        ]

    for candidate in candidates:
        if candidate.is_file():
            return str(candidate)
    return None


def _open_ui(url: str, open_browser: bool = True) -> None:
    """Open OmoModular inside a dedicated lightweight Chromium app window."""
    if not open_browser:
        return
    util.clean_stale_singleton(_PROFILE_DIR)
    binary = _find_windows_browser() if sys.platform == "win32" else util.which(*_BROWSERS)
    if binary and any(tag in Path(binary).name.lower() for tag in ("chrom", "brave", "msedge")):
        _PROFILE_DIR.mkdir(parents=True, exist_ok=True)
        util.spawn_detached([
            binary,
            f"--app={url}",
            "--class=omomodular",
            f"--user-data-dir={_PROFILE_DIR}",
            "--no-first-run",
            "--no-default-browser-check",
            "--autoplay-policy=no-user-gesture-required",
        ])
        return
    if binary:
        util.spawn_detached([binary, url])
        return
    if sys.platform == "win32":
        os.startfile(url)  # noqa: S606 - opens in the user's default browser
        return
    opener = util.which("xdg-open")
    if opener:
        util.spawn_detached([opener, url])
    else:
        print(f"omomodular: open {url} in your browser", file=sys.stderr)


def _running_instance(host: str, port: int) -> bool:
    """Check if OmoModular is already active on the target port."""
    if not util.port_open(host, port, 0.4):
        return False
    url = f"http://{host}:{port}/api/health"
    try:
        with urllib.request.urlopen(url, timeout=1.5) as resp:  # noqa: S310 - loopback
            data = json.load(resp)
            return data.get("app") == "OmoModular"
    except (OSError, ValueError):
        return False


def main() -> None:
    parser = argparse.ArgumentParser(
        description="OmoModular - Minimalist Eurorack ambient synthesizer for Omarchy."
    )
    parser.add_argument("-p", "--port", type=int, default=None, help="HTTP port (default: 8796, or config.toml)")
    parser.add_argument("--host", type=str, default=None, help="Host to bind (default: 127.0.0.1, or config.toml)")
    parser.add_argument("--no-open", action="store_true", help="Do not open browser window")
    parser.add_argument("-v", "--version", action="version", version=f"%(prog)s {__version__}")

    args = parser.parse_args()
    cfg = load_config()
    if args.port is not None:
        cfg.server.port = args.port
    if args.host is not None:
        cfg.server.host = args.host
    if args.no_open:
        cfg.server.open_app = False

    url = f"http://{cfg.server.host}:{cfg.server.port}"

    if _running_instance(cfg.server.host, cfg.server.port):
        print(f"omomodular: already running at {url}, bringing window to front...")
        if not util.focus_hyprland_window("OmoModular"):
            _open_ui(url, cfg.server.open_app)
        util.dismiss_launch_osd()
        sys.exit(0)

    app = create_app(cfg)
    uconf = uvicorn.Config(
        app,
        host=cfg.server.host,
        port=cfg.server.port,
        log_level="warning",
        access_log=False,
    )
    server = uvicorn.Server(uconf)

    async def _opener() -> None:
        if await util.wait_for_port(cfg.server.host, cfg.server.port, 10.0):
            _open_ui(url, cfg.server.open_app)
            await asyncio.sleep(0.5)
            util.dismiss_launch_osd()

    async def _run() -> None:
        await asyncio.gather(server.serve(), _opener())

    print(f"omomodular: serving on {url}")
    try:
        asyncio.run(_run())
    except KeyboardInterrupt:
        print("\nomomodular: stopped")


if __name__ == "__main__":
    main()

