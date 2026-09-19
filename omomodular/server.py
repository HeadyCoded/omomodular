"""FastAPI server for OmoModular: REST endpoints, theme watcher, and static web UI."""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse
from starlette.staticfiles import StaticFiles

from . import __version__, presets
from .config import Config, load as load_config

WEB_DIR = Path(__file__).parent / "web"


class _NoCacheStatic(StaticFiles):
    """Serve UI assets with no-cache headers to support instant iteration."""

    def is_not_modified(self, response_headers, request_headers) -> bool:  # type: ignore[override]
        return False

    async def get_response(self, path, scope):
        resp = await super().get_response(path, scope)
        resp.headers["Cache-Control"] = "no-cache"
        return resp


class ServerHub:
    """Manages WebSocket subscribers for theme reload events."""

    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.subscribers: set[asyncio.Queue] = set()

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self.subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        self.subscribers.discard(q)

    def broadcast(self, event: dict[str, Any]) -> None:
        for q in list(self.subscribers):
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                pass


async def _watch_theme(hub: ServerHub) -> None:
    """Watch user theme.css for changes and broadcast reload events."""
    theme_path = hub.cfg.theme_file
    last_mtime: float | None = None
    if theme_path.is_file():
        last_mtime = theme_path.stat().st_mtime

    while True:
        await asyncio.sleep(1.0)
        try:
            if theme_path.is_file():
                current_mtime = theme_path.stat().st_mtime
                if last_mtime is not None and current_mtime != last_mtime:
                    last_mtime = current_mtime
                    hub.broadcast({"type": "theme_changed"})
                elif last_mtime is None:
                    last_mtime = current_mtime
                    hub.broadcast({"type": "theme_changed"})
        except OSError:
            pass


def create_app(cfg: Config | None = None) -> FastAPI:
    """Instantiate and configure the FastAPI application."""
    if cfg is None:
        cfg = load_config()

    hub = ServerHub(cfg)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        task = asyncio.create_task(_watch_theme(hub))
        try:
            yield
        finally:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    app = FastAPI(
        title="OmoModular",
        version=__version__,
        lifespan=lifespan,
    )

    @app.get("/api/health")
    async def health():
        return {"status": "ok", "app": "OmoModular", "version": __version__}

    @app.get("/api/state")
    async def get_state():
        state = presets.load_state(cfg.state_file)
        return state

    @app.post("/api/state")
    async def set_state(state: dict[str, Any]):
        presets.save_state(state, cfg.state_file)
        return {"status": "saved"}

    @app.get("/api/presets")
    async def get_presets():
        return presets.list_presets(cfg.patches_dir)

    @app.get("/api/presets/{name}")
    async def get_preset(name: str):
        patch = presets.get_preset(name, cfg.patches_dir)
        if patch is None:
            raise HTTPException(status_code=404, detail="Preset not found")
        return patch

    @app.post("/api/presets/{name}")
    async def post_preset(name: str, patch: dict[str, Any]):
        path = presets.save_user_preset(name, patch, cfg.patches_dir)
        return {"status": "saved", "name": path.stem}

    @app.delete("/api/presets/{name}")
    async def delete_preset(name: str):
        target = cfg.patches_dir / f"{name}.json"
        if target.is_file():
            target.unlink()
            return {"status": "deleted"}
        raise HTTPException(status_code=404, detail="Preset file not found")

    @app.get("/api/midi/starters")
    async def get_midi_starters(filter_type: str = "all"):
        from . import midi_service
        return midi_service.list_starter_midis(filter_type=filter_type)

    @app.get("/api/midi/search")
    async def search_midi(q: str = "", filter_type: str = "all"):
        from . import midi_service
        results = await midi_service.search_midi(q, filter_type=filter_type)
        return {"query": q, "filter_type": filter_type, "count": len(results), "results": results}

    @app.get("/api/midi/download")
    async def download_midi(slug: str | None = None, starter: str | None = None):
        from . import midi_service
        file_path = await midi_service.fetch_midi(slug=slug, starter=starter)
        if file_path is None or not file_path.is_file():
            raise HTTPException(status_code=404, detail="MIDI file not found")
        return FileResponse(file_path, media_type="audio/midi", filename=file_path.name)

    @app.get("/theme.css")
    async def get_theme():
        if cfg.theme_file.is_file():
            return FileResponse(cfg.theme_file, media_type="text/css")
        fallback = WEB_DIR / "theme.css"
        return FileResponse(fallback, media_type="text/css")

    @app.websocket("/ws/theme")
    async def theme_ws(ws: WebSocket):
        await ws.accept()
        q = hub.subscribe()
        try:
            while True:
                msg = await q.get()
                await ws.send_json(msg)
        except (WebSocketDisconnect, asyncio.CancelledError):
            pass
        finally:
            hub.unsubscribe(q)

    # Static assets
    app.mount("/", _NoCacheStatic(directory=WEB_DIR, html=True), name="web")

    return app
