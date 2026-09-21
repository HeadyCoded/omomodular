import asyncio
import os
import socket
from pathlib import Path

import pytest

from omomodular import util


def test_which():
    assert util.which("python3", "nonexistent_binary_xyz") is not None
    assert util.which("nonexistent_binary_xyz") is None


def test_port_open_closed():
    # An arbitrarily high unused port
    assert not util.port_open("127.0.0.1", 59999, timeout=0.1)


def test_port_open_and_wait():
    # Spin up a temporary listening socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(("127.0.0.1", 0))
    sock.listen(1)
    port = sock.getsockname()[1]

    try:
        assert util.port_open("127.0.0.1", port)

        async def run_wait():
            return await util.wait_for_port("127.0.0.1", port, timeout=1.0)

        assert asyncio.run(run_wait())
    finally:
        sock.close()


def test_clean_stale_singleton(tmp_path: Path):
    profile_dir = tmp_path / "browser"
    profile_dir.mkdir(parents=True)

    # Stale lock pointing to non-existent PID 99999999
    lock_file = profile_dir / "SingletonLock"
    os.symlink("omarchy-99999999", lock_file)

    socket_file = profile_dir / "SingletonSocket"
    os.symlink("/tmp/nonexistent/SingletonSocket", socket_file)

    cookie_file = profile_dir / "SingletonCookie"
    cookie_file.write_text("12345")

    util.clean_stale_singleton(profile_dir)

    assert not lock_file.exists()
    assert not socket_file.exists()
    assert not cookie_file.exists()


def test_dismiss_launch_osd():
    # Should run cleanly and not raise even if omarchy-shell is not active or present
    util.dismiss_launch_osd()


def test_focus_hyprland_window_nomatch():
    # Pattern matching a nonexistent title/class returns False cleanly
    assert not util.focus_hyprland_window("__DEFINITELY_NONEXISTENT_WINDOW_XYZ__")


def test_prune_cache_dir_evicts_oldest_first(tmp_path: Path):
    cache_dir = tmp_path / "cache"
    cache_dir.mkdir()

    old = cache_dir / "old.bin"
    old.write_bytes(b"x" * 100)
    os.utime(old, (1000, 1000))

    new = cache_dir / "new.bin"
    new.write_bytes(b"x" * 100)
    os.utime(new, (2000, 2000))

    util.prune_cache_dir(cache_dir, max_bytes=150)

    assert not old.exists()
    assert new.exists()


def test_prune_cache_dir_noop_under_limit(tmp_path: Path):
    cache_dir = tmp_path / "cache"
    cache_dir.mkdir()
    f = cache_dir / "f.bin"
    f.write_bytes(b"x" * 50)

    util.prune_cache_dir(cache_dir, max_bytes=1000)

    assert f.exists()
