"""OpenAI news scraper: fetches the public RSS feed and parses to JSON."""

import json

from .common import http_get, write_output
from .rss import parse_rss

FEED_URL = "https://openai.com/news/rss.xml"
MAX_AGE_DAYS = 30
OUTPUT_FILENAME = "openai.json"


def scrape() -> None:
    xml_text = http_get(FEED_URL).decode("utf-8")
    articles = parse_rss(xml_text, source="OpenAI", max_age_days=MAX_AGE_DAYS)
    write_output(OUTPUT_FILENAME, json.dumps(articles, indent=2) + "\n")
