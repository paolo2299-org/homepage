"""Google blog scraper: fetches the developer-tools JSON feed and saves verbatim."""

import json

from .common import http_get, write_output

FEED_URL = (
    "https://blog.google/api/v2/latest/"
    "?author_ids=&category=all&hero_template=heroArticleItem"
    "&image_format=webp&cursor=1&paginate=20&show_hero=true"
    "&site_id=2&tags=products-developer-tools"
)
OUTPUT_FILENAME = "google.json"


def scrape() -> None:
    raw = http_get(FEED_URL).decode("utf-8")
    # Validate it parses as JSON, but write the original bytes so we don't lose anything.
    json.loads(raw)
    write_output(OUTPUT_FILENAME, raw)
