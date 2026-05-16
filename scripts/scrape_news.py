#!/usr/bin/env python3
"""Run all AI news scrapers, writing raw data into frontend/ai-news/raw/.

Each scraper runs independently; failures are logged to stderr. Exits non-zero
only if every scraper failed.
"""

import sys
import traceback

from scrapers import anthropic, google, openai

SCRAPERS = [
    ("openai", openai.scrape),
    ("google", google.scrape),
    ("anthropic", anthropic.scrape),
]


def main() -> int:
    successes = 0
    for name, scrape in SCRAPERS:
        try:
            scrape()
            print(f"[{name}] ok", file=sys.stderr)
            successes += 1
        except Exception:
            print(f"[{name}] FAILED", file=sys.stderr)
            traceback.print_exc()

    if successes == 0:
        print("All scrapers failed", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
