#!/usr/bin/env python3
"""Parse an RSS XML file and output recent articles as JSON.

Usage: python parse-rss.py <file> [--days N] [--source SOURCE]

Reads an RSS XML file, extracts items, filters to those published within
the last N days (default 3, inclusive of today), and prints a JSON array
to stdout.
"""

import argparse
import json
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime


def parse_rss(path: str, max_age_days: int, source: str) -> list[dict]:
    tree = ET.parse(path)
    root = tree.getroot()
    cutoff = datetime.now(timezone.utc) - timedelta(days=max_age_days)
    articles = []

    for item in root.iter("item"):
        title_el = item.find("title")
        link_el = item.find("link")
        pub_date_el = item.find("pubDate")

        if title_el is None or link_el is None or pub_date_el is None:
            continue

        title = (title_el.text or "").strip()
        link = (link_el.text or "").strip()

        try:
            pub_date = parsedate_to_datetime(pub_date_el.text.strip())
        except (ValueError, TypeError):
            continue

        if pub_date < cutoff:
            continue

        articles.append({
            "title": title,
            "url": link,
            "source": source,
            "date": pub_date.strftime("%Y-%m-%d"),
        })

    articles.sort(key=lambda a: a["date"], reverse=True)
    return articles


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file", help="Path to RSS XML file")
    parser.add_argument("--days", type=int, default=3, help="Max age in days (default: 3)")
    parser.add_argument("--source", default="OpenAI", help="Source name (default: OpenAI)")
    args = parser.parse_args()

    try:
        articles = parse_rss(args.file, args.days, args.source)
    except ET.ParseError as e:
        print(f"Error parsing XML: {e}", file=sys.stderr)
        sys.exit(1)

    json.dump(articles, sys.stdout, indent=2)
    print()


if __name__ == "__main__":
    main()
