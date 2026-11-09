"""Create the Elasticsearch indices and load the programme.  python data/ingest.py [--reset]

Needs ES_URL and ES_API_KEY (in api/.env or the environment). --reset deletes and recreates every index: tell the
team first. Run `python data/generate.py` before this if the programme changed.
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "api"))

from app.es.ingest import ingest  # noqa: E402

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--reset", action="store_true", help="delete and recreate all indices first")
    print(ingest(reset=ap.parse_args().reset))
