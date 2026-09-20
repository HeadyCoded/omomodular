"""Utility helpers for process management and network ports."""
from __future__ import annotations

import asyncio
import json
import os
import shutil
import socket
import subprocess
from contextlib import closing
from pathlib import Path
from typing import Sequence


def which(*names: str) -> str | None:
    """Return absolute path to the first existing executable in names."""
    for n in names:
        found = shutil.which(n)
        if found:
            return found
    return None


def port_open(host: str, port: int, timeout: float = 0.5) -> bool:
    """Return True if host:port accepts a TCP connection."""
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
        sock.settimeout(timeout)
        try:
            return sock.connect_ex((host, port)) == 0
        except OSError:
            return False


async def wait_for_port(
    host: str, port: int, timeout: float = 10.0, interval: float = 0.2
) -> bool:
    """Poll asynchronously until host:port accepts TCP connections or timeout elapses."""
    loop = asyncio.get_running_loop()
    deadline = loop.time() + timeout
    while loop.time() < deadline:
        if await asyncio.to_thread(port_open, host, port, interval):
            return True
        await asyncio.sleep(interval)
    return False


def clean_stale_singleton(profile_dir: Path) -> None:
    """Remove stale Chromium SingletonLock/SingletonSocket if process is dead."""
    lock = profile_dir / "SingletonLock"
    if not lock.exists() and not lock.is_symlink():
        return
    try:
        target = os.readlink(lock)
        parts = target.split("-")
        if len(parts) >= 2 and parts[-1].isdigit():
            pid = int(parts[-1])
            try:
                os.kill(pid, 0)
                # Process is still running; do not delete active lock
                return
            except OSError:
                pass
    except OSError:
        pass

    for name in ("SingletonLock", "SingletonSocket", "SingletonCookie"):
        p = profile_dir / name
        try:
            p.unlink(missing_ok=True)
        except OSError:
            pass


def focus_hyprland_window(pattern: str = "OmoModular") -> bool:
    """Find and focus an existing window matching pattern in Hyprland."""
    if not which("hyprctl"):
        return False
    try:
        res = subprocess.run(
            ["hyprctl", "clients", "-j"],
            capture_output=True,
            text=True,
            timeout=1.0,
            check=False,
        )
        if res.returncode != 0 or not res.stdout.strip():
            return False
        clients = json.loads(res.stdout)
        pat = pattern.lower()
        for c in clients:
            title = c.get("title", "").lower()
            cls = c.get("class", "").lower()
            if pat in title or pat in cls:
                addr = c.get("address")
                if addr:
                    subprocess.run(
                        ["hyprctl", "dispatch", f'hl.dsp.focus({{ window = "address:{addr}" }})'],
                        capture_output=True,
                        timeout=1.0,
                        check=False,
                    )
                    return True
    except Exception:
        pass
    return False


def dismiss_launch_osd() -> None:
    """Close any active launch feedback OSD on Omarchy shell."""
    cmd = which("omarchy-shell") or "/usr/share/omarchy/bin/omarchy-shell"
    if Path(cmd).is_file():
        try:
            subprocess.run([cmd, "-q", "osd", "close"], timeout=1.0, check=False)
        except Exception:
            pass


def spawn_detached(cmd: Sequence[str]) -> subprocess.Popen:
    """Spawn a subprocess fully detached from the parent terminal/session."""
    return subprocess.Popen(
        cmd,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
