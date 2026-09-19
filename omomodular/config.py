"""Configuration loading and path defaults for OmoModular."""
from __future__ import annotations

import os
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


def load() -> Config:
    """Load config and ensure required directories exist."""
    cfg = Config()
    cfg.config_dir.mkdir(parents=True, exist_ok=True)
    cfg.patches_dir.mkdir(parents=True, exist_ok=True)
    return cfg
