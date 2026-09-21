"""MIDI search and fetch service: BitMidi archive scraper, cache, starter catalog, and track analysis."""
from __future__ import annotations

import asyncio
import html
import re
import struct
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from .util import prune_cache_dir

MIDI_DIR = Path(__file__).parent / "midi"
CACHE_DIR = MIDI_DIR / "downloads"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0"
MAX_DOWNLOAD_BYTES = 5 * 1024 * 1024  # 5MB: generous for a MIDI file, bounds worst case
MAX_CACHE_BYTES = 100 * 1024 * 1024  # 100MB total across cached downloads


def inspect_midi_header(file_path: Path) -> tuple[int, int]:
    """Return (format, num_tracks) from MIDI header."""
    try:
        data = file_path.read_bytes()[:14]
        if len(data) >= 14 and data.startswith(b"MThd"):
            _, fmt, num_tracks, _ = struct.unpack(">IHHH", data[4:14])
            return fmt, num_tracks
    except Exception:
        pass
    return 1, 1


def list_starter_midis(filter_type: str = "all") -> list[dict[str, Any]]:
    """List bundled starter MIDI files with track count inspection."""
    starters = []
    if not MIDI_DIR.is_dir():
        return starters

    for p in sorted(MIDI_DIR.glob("*.mid")):
        fmt, num_tracks = inspect_midi_header(p)
        is_single = (num_tracks <= 1) or ("1-Track" in p.name) or (fmt == 0)

        if filter_type == "single" and not is_single:
            continue
        if filter_type == "multi" and is_single:
            continue

        starters.append({
            "title": p.stem,
            "filename": p.name,
            "size": p.stat().st_size,
            "tracks_count": 1 if is_single else num_tracks,
            "is_single_track": is_single,
            "source": "1-Track Riff" if is_single else "Multi-Track Song",
            "is_starter": True,
            "download_url": f"/api/midi/download?starter={urllib.parse.quote(p.name)}",
        })
    return starters


def _sync_search_bitmidi(query: str, filter_type: str = "all") -> list[dict[str, Any]]:
    """Search local catalog and BitMidi archive synchronously with single/multi track handling."""
    query = query.strip()
    starters = list_starter_midis(filter_type="all")

    if not query:
        if filter_type == "single":
            return [s for s in starters if s["is_single_track"]]
        elif filter_type == "multi":
            return [s for s in starters if not s["is_single_track"]]
        return starters

    results: list[dict[str, Any]] = []
    seen_titles: set[str] = set()
    seen_slugs: set[str] = set()

    q_lower = query.lower()
    q_words = [w for w in re.split(r'[\s\-_,.]+', q_lower) if w]

    # 1. Match against local starter library first (token and substring matching)
    for s in starters:
        s_title_lower = s["title"].lower()
        matched = False
        if q_lower in s_title_lower:
            matched = True
        elif q_words and all(w in s_title_lower for w in q_words):
            matched = True
        elif q_words and any(w in s_title_lower for w in q_words):
            matched = True

        if matched:
            seen_titles.add(s_title_lower)
            results.append(s)

    # 2. Query BitMidi catalog
    search_url = f"https://bitmidi.com/search?q={urllib.parse.quote(query)}"
    req = urllib.request.Request(search_url, headers={"User-Agent": USER_AGENT})

    try:
        with urllib.request.urlopen(req, timeout=6.0) as resp:
            content = resp.read().decode("utf-8", errors="ignore")
    except Exception:
        content = ""

    if content:
        matches = re.findall(
            r'<a[^>]+href=[\"\'](/([a-zA-Z0-9_-]+-mid[0-9-]*))[\"\'](?:[^>]*title=[\"\']([^\"\']+)[\"\'])?[^>]*>(.*?)</a>',
            content,
            re.DOTALL
        )

        for rel_url, slug, title_attr, inner_text in matches:
            if slug in seen_slugs:
                continue
            seen_slugs.add(slug)

            clean_title = title_attr or re.sub(r'<[^>]+>', '', inner_text).strip()
            clean_title = html.unescape(clean_title)
            if not clean_title:
                clean_title = slug.replace('-mid', '').replace('-', ' ').title()
            clean_title = re.sub(r'\.mid$', '', clean_title, flags=re.IGNORECASE)

            if clean_title.lower() in seen_titles:
                continue
            seen_titles.add(clean_title.lower())

            title_lower = clean_title.lower()
            is_riff_hint = any(k in title_lower for k in ("riff", "bass", "solo", "lead", "arp", "hook", "groove", "theme", "intro"))

            # Check if already cached
            cache_file = CACHE_DIR / f"{slug}.mid"
            cached_tracks = 1 if is_riff_hint else 3
            if cache_file.is_file():
                _, cached_tracks = inspect_midi_header(cache_file)
                is_single = (cached_tracks <= 1)
            else:
                is_single = is_riff_hint

            results.append({
                "title": clean_title,
                "slug": slug,
                "tracks_count": cached_tracks,
                "is_single_track": is_single,
                "source": "1-Track Riff" if is_single else "BitMidi Song",
                "is_starter": False,
                "page_url": f"https://bitmidi.com{rel_url}",
                "download_url": f"/api/midi/download?slug={slug}",
            })

    # Filter / sort results
    if filter_type == "single":
        singles = [r for r in results if r["is_single_track"]]
        multis = [r for r in results if not r["is_single_track"]]
        # If single-track loops exist, show them; otherwise fallback to multi-track with [1-TRK] isolate button
        return singles if singles else multis
    elif filter_type == "multi":
        multis = [r for r in results if not r["is_single_track"]]
        return multis if multis else results
    return results


async def search_midi(query: str, filter_type: str = "all") -> list[dict[str, Any]]:
    """Async search wrapper with single/multi track filtering."""
    return await asyncio.to_thread(_sync_search_bitmidi, query, filter_type)


def _sync_fetch_slug(slug: str) -> Path | None:
    """Download MIDI file for slug, caching to CACHE_DIR."""
    clean_slug = re.sub(r'[^a-zA-Z0-9_-]', '', slug)
    if not clean_slug:
        return None

    cache_file = CACHE_DIR / f"{clean_slug}.mid"
    if cache_file.is_file() and cache_file.stat().st_size > 0:
        return cache_file

    page_url = f"https://bitmidi.com/{clean_slug}"
    req = urllib.request.Request(page_url, headers={"User-Agent": USER_AGENT})

    try:
        with urllib.request.urlopen(req, timeout=6.0) as resp:
            content = resp.read().decode("utf-8", errors="ignore")
    except Exception:
        return None

    match = re.search(r'href=[\"\'](/uploads/[0-9]+\.mid)[\"\']', content)
    if not match:
        return None

    dl_url = f"https://bitmidi.com{match.group(1)}"
    req_dl = urllib.request.Request(dl_url, headers={"User-Agent": USER_AGENT})

    try:
        with urllib.request.urlopen(req_dl, timeout=8.0) as resp:
            data = resp.read(MAX_DOWNLOAD_BYTES + 1)
        if len(data) > MAX_DOWNLOAD_BYTES:
            return None
        if data.startswith(b"MThd"):
            cache_file.write_bytes(data)
            prune_cache_dir(CACHE_DIR, MAX_CACHE_BYTES)
            return cache_file
    except Exception:
        return None

    return None


async def fetch_midi(slug: str | None = None, starter: str | None = None) -> Path | None:
    """Fetch MIDI file from starter library or BitMidi."""
    if starter:
        clean_name = Path(starter).name
        target = MIDI_DIR / clean_name
        if target.is_file():
            return target
        return None

    if slug:
        return await asyncio.to_thread(_sync_fetch_slug, slug)

    return None
