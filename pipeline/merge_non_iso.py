"""
Merge non-ISO project lists into public/data/queue_raw.json.
Deduplicates by ISO so re-runs fully refresh each non-ISO source.
"""

import json
import os


def merge_into_queue(new_projects: list[dict], queue_path: str = 'public/data/queue_raw.json') -> None:
    """Append new_projects to queue_raw.json, replacing any existing entries for the same ISO sources."""
    if not new_projects:
        return

    existing = []
    if os.path.exists(queue_path):
        with open(queue_path) as f:
            existing = json.load(f)

    # Remove old entries for these ISOs (full refresh per source)
    isos_in_new = {p['iso'] for p in new_projects}
    kept = [p for p in existing if p.get('iso') not in isos_in_new]
    merged = kept + new_projects

    with open(queue_path, 'w') as f:
        json.dump(merged, f)

    print(f'  Merged {len(new_projects)} non-ISO projects ({", ".join(sorted(isos_in_new))}) → {len(merged)} total in {queue_path}')
