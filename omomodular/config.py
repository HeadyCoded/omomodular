"""Configuration loading and path defaults for OmoModular."""
from __future__ import annotations

import os
import tomllib
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class ServerConfig:
    host: str = "127.0.0.1"
    port: int = 8796
    open_app: bool = True
    browser: str | None = None


@dataclass
class Config:
    server: ServerConfig = field(default_factory=ServerConfig)
    config_dir: Path = field(
        default_factory=lambda: Path(
            os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config")
        )
        / "omomodular"
    )

    @property
    def patches_dir(self) -> Path:
        return self.config_dir / "patches"

    @property
    def state_file(self) -> Path:
        return self.config_dir / "state.json"

    @property
    def theme_file(self) -> Path:
        return self.config_dir / "theme.css"

    @property
    def toml_file(self) -> Path:
        return self.config_dir / "config.toml"


def load() -> Config:
    """Load config from config.toml (if present) and ensure required directories exist."""
    cfg = Config()
    cfg.config_dir.mkdir(parents=True, exist_ok=True)
    cfg.patches_dir.mkdir(parents=True, exist_ok=True)

    if cfg.toml_file.is_file():
        try:
            data = tomllib.loads(cfg.toml_file.read_text("utf-8"))
        except (tomllib.TOMLDecodeError, OSError):
            data = {}
        server_data = data.get("server", {})
        if "host" in server_data:
            cfg.server.host = str(server_data["host"])
        if "port" in server_data:
            cfg.server.port = int(server_data["port"])
        if "open_app" in server_data:
            cfg.server.open_app = bool(server_data["open_app"])
        if "browser" in server_data:
            cfg.server.browser = str(server_data["browser"])

    return cfg
