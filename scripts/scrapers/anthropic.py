"""Anthropic blog scraper: uses jina.ai Reader to fetch markdown of claude.com/blog."""

import os

from .common import http_get, write_output

TARGET_URL = "https://claude.com/blog"
READER_URL = f"https://r.jina.ai/{TARGET_URL}"
OUTPUT_FILENAME = "anthropic.md"


def scrape() -> None:
    api_key = os.environ.get("JINA_API_KEY")
    if not api_key:
        raise RuntimeError("JINA_API_KEY environment variable is required")

    markdown = http_get(READER_URL, headers={"Authorization": f"Bearer {api_key}"}).decode("utf-8")
    write_output(OUTPUT_FILENAME, markdown)
