"""Utility helpers for process management and network ports."""
from __future__ import annotations

import os
import shutil
import socket
import subprocess
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
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    try:
        sock.connect((host, port))
        sock.close()
        return True
    except OSError:
        return False


def spawn_detached(cmd: Sequence[str]) -> subprocess.Popen:
    """Spawn a subprocess fully detached from the parent terminal/session."""
    return subprocess.Popen(
        cmd,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
