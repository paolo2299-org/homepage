"""Generic RSS 2.0 parsing — extracts items into normalized dicts."""

import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime


def parse_rss(xml_text: str, source: str, max_age_days: int) -> list[dict]:
    """Parse RSS XML and return items newer than `max_age_days`, newest first."""
    root = ET.fromstring(xml_text)
    cutoff = datetime.now(timezone.utc) - timedelta(days=max_age_days)
    articles = []

    for item in root.iter("item"):
        title_el = item.find("title")
        link_el = item.find("link")
        pub_date_el = item.find("pubDate")

        if title_el is None or link_el is None or pub_date_el is None:
            continue

        try:
            pub_date = parsedate_to_datetime((pub_date_el.text or "").strip())
        except (ValueError, TypeError):
            continue

        if pub_date < cutoff:
            continue

        articles.append({
            "title": (title_el.text or "").strip(),
            "url": (link_el.text or "").strip(),
            "source": source,
            "date": pub_date.strftime("%Y-%m-%d"),
        })

    articles.sort(key=lambda a: a["date"], reverse=True)
    return articles
