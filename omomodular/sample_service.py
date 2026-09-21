"""Sample search, fetch, and caching service: starter kits, local cache, and Freesound CC0 search."""
from __future__ import annotations

import asyncio
import json
import os
import urllib.parse
import urllib.request
import wave
from pathlib import Path
from typing import Any

from .util import prune_cache_dir

SAMPLE_DIR = Path(__file__).parent / "samples"
# Bundled starter samples ship read-only alongside the installed package, but
# downloaded previews must land somewhere writable -- SAMPLE_DIR itself is
# root-owned on a real (non-editable) install. XDG_CACHE_HOME is the correct
# home for re-fetchable cache data.
CACHE_DIR = Path(os.environ.get("XDG_CACHE_HOME", Path.home() / ".cache")) / "omomodular" / "samples"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0"
MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024  # 25MB: generous for a sample preview, bounds worst case
MAX_CACHE_BYTES = 500 * 1024 * 1024  # 500MB total across cached previews


def inspect_wav_info(file_path: Path) -> dict[str, Any]:
    """Inspect duration, channels, sample rate, and bit depth of a WAV file."""
    try:
        with wave.open(str(file_path), "rb") as w:
            n_channels = w.getnchannels()
            sampwidth = w.getsampwidth()
            framerate = w.getframerate()
            n_frames = w.getnframes()
            dur = n_frames / float(framerate) if framerate > 0 else 0.0
            return {
                "duration": round(dur, 2),
                "channels": n_channels,
                "samplerate": framerate,
                "bitdepth": sampwidth * 8,
            }
    except Exception:
        return {"duration": 0.5, "channels": 1, "samplerate": 44100, "bitdepth": 16}


def infer_sample_category(name: str) -> str:
    """Infer drum category from filename."""
    n = name.lower()
    if any(k in n for k in ("kick", "bd", "bassdrum", "sub")):
        return "kick"
    if any(k in n for k in ("snare", "sd", "rim")):
        return "snare"
    if any(k in n for k in ("hat", "hh", "cymbal", "ride", "crash")):
        return "hihat"
    if any(k in n for k in ("break", "loop", "amen", "amen_break")):
        return "break"
    return "perc"


def list_starter_samples(category: str = "all") -> list[dict[str, Any]]:
    """List bundled offline drum starter samples."""
    samples = []
    if not SAMPLE_DIR.is_dir():
        return samples

    for p in sorted(SAMPLE_DIR.glob("*.wav")):
        cat = infer_sample_category(p.name)
        if category != "all" and cat != category:
            continue

        info = inspect_wav_info(p)
        title = p.stem.replace("_", " ")
        samples.append({
            "id": f"starter_{p.stem}",
            "title": title,
            "filename": p.name,
            "category": cat,
            "duration": info["duration"],
            "samplerate": info["samplerate"],
            "bitdepth": info["bitdepth"],
            "is_starter": True,
            "download_url": f"/api/samples/download?starter={urllib.parse.quote(p.name)}",
        })
    return samples


def get_freesound_key(provided_key: str | None = None) -> str | None:
    """Retrieve Freesound API key from argument, env, or config file."""
    if provided_key and provided_key.strip():
        return provided_key.strip()
    env_key = os.environ.get("FREESOUND_API_KEY")
    if env_key and env_key.strip():
        return env_key.strip()
    key_file = Path.home() / ".config/omomodular/freesound_key.txt"
    if key_file.is_file():
        k = key_file.read_text("utf-8").strip()
        if k:
            return k
    return None


def _sync_search_freesound(query: str, category: str = "all", api_key: str | None = None) -> list[dict[str, Any]]:
    """Query Freesound REST API v2 for Creative Commons 0 drum samples."""
    key = get_freesound_key(api_key)
    if not key:
        return []

    q_parts = [query] if query else []
    if category != "all":
        q_parts.append(category)
    q_str = " ".join(q_parts) or "drum"

    url = (
        f"https://freesound.org/apiv2/search/text/?"
        f"query={urllib.parse.quote(q_str)}"
        f"&filter=license:%22Creative+Commons+0%22"
        f"&fields=id,name,duration,previews,type,samplerate,filesize"
        f"&page_size=25"
        f"&token={key}"
    )

    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=5.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            results = []
            for item in data.get("results", []):
                previews = item.get("previews", {})
                preview_url = previews.get("preview-hq-mp3") or previews.get("preview-hq-ogg") or previews.get("preview-lq-mp3")
                if not preview_url:
                    continue
                name = item.get("name", f"sample_{item['id']}")
                cat = infer_sample_category(name)
                results.append({
                    "id": f"fs_{item['id']}",
                    "title": name.replace(".wav", "").replace(".mp3", "").replace("_", " "),
                    "filename": name,
                    "category": cat,
                    "duration": round(item.get("duration", 0.0), 2),
                    "samplerate": item.get("samplerate", 44100),
                    "is_starter": False,
                    "source": "Freesound CC0",
                    "preview_url": preview_url,
                    "download_url": f"/api/samples/download?url={urllib.parse.quote(preview_url)}&name={urllib.parse.quote(name)}",
                })
            return results
    except Exception as e:
        print("Freesound search error:", e)
        return []


async def search_samples(query: str = "", category: str = "all", api_key: str | None = None) -> list[dict[str, Any]]:
    """Search samples: matches offline starters first, then queries Freesound API if key is available."""
    # Filter starters first
    starters = list_starter_samples(category=category)
    matched_starters = []
    q_lower = query.lower().strip()
    for s in starters:
        if not q_lower or q_lower in s["title"].lower() or q_lower in s["category"]:
            matched_starters.append(s)

    # If API key is configured, search online in executor
    key = get_freesound_key(api_key)
    if key:
        loop = asyncio.get_running_loop()
        online_results = await loop.run_in_executor(None, _sync_search_freesound, query, category, key)
        return matched_starters + online_results

    return matched_starters


async def fetch_sample(starter: str | None = None, url: str | None = None, name: str | None = None) -> Path | None:
    """Fetch sample by starter name or download external preview URL into cache."""
    if starter:
        p = SAMPLE_DIR / Path(starter).name
        if p.is_file():
            return p
        return None

    if url:
        if urllib.parse.urlparse(url).scheme not in ("http", "https"):
            return None

        safe_name = "".join(c for c in (name or "sample.mp3") if c.isalnum() or c in (".", "-", "_")).strip()
        safe_name = Path(safe_name or "sample.mp3").name
        cached = CACHE_DIR / safe_name
        if cached.is_file() and cached.stat().st_size > 0:
            return cached

        loop = asyncio.get_running_loop()

        def _download() -> Path | None:
            try:
                req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
                with urllib.request.urlopen(req, timeout=8.0) as resp:
                    data = resp.read(MAX_DOWNLOAD_BYTES + 1)
                    if len(data) > MAX_DOWNLOAD_BYTES:
                        print("Sample preview exceeded max download size, discarding:", url)
                        return None
                    cached.write_bytes(data)
                    prune_cache_dir(CACHE_DIR, MAX_CACHE_BYTES)
                    return cached
            except Exception as e:
                print("Failed to download sample preview:", e)
                return None

        return await loop.run_in_executor(None, _download)

    return None
