"""Shared helpers for news scrapers."""

import os
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = REPO_ROOT / "frontend" / "ai-news" / "raw"

DEFAULT_TIMEOUT = 30
USER_AGENT = "pdlawson-homepage-scraper/1.0 (+https://pdlawson.com)"


def http_get(url: str, headers: dict | None = None, timeout: int = DEFAULT_TIMEOUT) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def write_output(filename: str, content: bytes | str) -> Path:
    """Atomically write content to OUTPUT_DIR/filename."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUTPUT_DIR / filename
    tmp = path.with_suffix(path.suffix + ".tmp")
    data = content.encode("utf-8") if isinstance(content, str) else content
    tmp.write_bytes(data)
    os.replace(tmp, path)
    return path
