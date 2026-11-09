"""Generate the synthetic programme: ~30 original talks in the demo venue's rooms. Fixed seed, so output is stable.

Run from the repo root:  python data/generate.py
Writes api/app/data/talks_generated.json (read by the API and by data/ingest.py). Original text only.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

SEED = 20261109
OUT = Path(__file__).resolve().parent.parent / "api" / "app" / "data" / "talks_generated.json"

ROOMS = {"room-251": (2, "quiet-room-2", 2), "room-355": (3, "quiet-room-3", 2), "ballroom-e": (1, "quiet-room-1", 3)}
# (room, start, end) minutes from midnight already used by the four hand-written demo talks.
TAKEN = {("room-355", 840, 880), ("room-251", 900, 940), ("room-251", 930, 960), ("ballroom-e", 840, 880)}
STARTS = list(range(660, 990, 30))  # 11:00 to 16:30, half-hour grid, 25-minute talks

SUBJECTS = [
    (
        "Security",
        "Reading a vulnerability report without panic",
        "How to rank findings by what can actually be reached, and what to fix first.",
    ),
    (
        "Security",
        "Signing images the easy way",
        "A walk through signing and verifying container images, with the three mistakes teams make.",
    ),
    ("Security", "Secrets that stay secret", "Where credentials leak in a cluster and the small habits that stop it."),
    (
        "Security",
        "Network policy for humans",
        "Draw the allowed conversations first, then write the rules. One diagram, no jargon.",
    ),
    (
        "Security",
        "Incident drills that do not hurt",
        "Run a calm practice incident with a clear script and a kind debrief.",
    ),
    (
        "Observability",
        "Alerts people can sleep through",
        "Cut noisy alerts down to the few that need a person, using service level goals.",
    ),
    (
        "Observability",
        "Following one request across ten services",
        "Tracing explained with a single slow checkout from start to finish.",
    ),
    (
        "Observability",
        "Dashboards that answer one question",
        "Design a dashboard around a question, not a pile of graphs.",
    ),
    ("Observability", "Logs you can search at 3 AM", "Structured logging habits that make an outage shorter."),
    (
        "Platform engineering",
        "A paved road for new services",
        "Give teams a default path that is safe, quick and easy to leave when needed.",
    ),
    (
        "Platform engineering",
        "Upgrading clusters without drama",
        "A boring checklist for version upgrades, with rollback built in.",
    ),
    (
        "Platform engineering",
        "Cost you can explain",
        "Tag, measure and explain cluster spend to people who do not run clusters.",
    ),
    (
        "Platform engineering",
        "Docs as a product",
        "Treat internal documentation like a product with users, feedback and owners.",
    ),
    ("Networking", "How traffic really gets in", "Ingress, gateways and load balancers in one clear picture."),
    (
        "Networking",
        "Service mesh, with and without",
        "What a mesh gives you, what it costs, and when plain networking is enough.",
    ),
    ("Networking", "DNS is the answer", "Why so many outages are DNS, and how to see it coming."),
    (
        "AI",
        "Running small models near your data",
        "Practical notes on serving a small language model inside a cluster.",
    ),
    ("AI", "Testing prompts like code", "Version, test and review prompts the way a team reviews a pull request."),
    ("AI", "Guardrails for helpful assistants", "Limit what an assistant can touch and show people what it did."),
    (
        "Platform engineering",
        "GitOps in a small team",
        "Keep the cluster state in git without adding a second job for everyone.",
    ),
    ("Observability", "Reading a flame graph", "Find the slow part of a program by looking at one picture."),
    (
        "Security",
        "Least privilege, one role at a time",
        "Trim a broad role down to what is needed, and prove nothing broke.",
    ),
    ("Networking", "Debugging a stuck connection", "A step-by-step method for finding where a packet stops."),
    ("AI", "Evaluating answers that sound right", "Simple checks that catch confident but wrong answers."),
    (
        "Platform engineering",
        "Scheduling with constraints",
        "Taints, affinities and requests explained with a seating-plan analogy.",
    ),
    (
        "Observability",
        "Beginner's guide to SLOs",
        "Pick one number that says if users are happy, and use it to decide what to do next.",
    ),
]
LEVEL_WORDS = {"Beginner-friendly": "Beginner-friendly"}


def build() -> list[dict]:
    rng = random.Random(SEED)
    used = set(TAKEN)
    talks: list[dict] = []
    subjects = SUBJECTS[:]
    rng.shuffle(subjects)
    slots = [(r, s) for s in STARTS for r in ROOMS]
    rng.shuffle(slots)
    n = 0
    for topic, title, abstract in subjects:
        for room, start in list(slots):
            end = start + 25
            if any(r == room and not (end <= a or start >= b) for r, a, b in used):
                continue
            slots.remove((room, start))
            used.add((room, start, end))
            floor, quiet, walk = ROOMS[room]
            n += 1
            beginner = rng.random() < 0.4
            topics = [topic] + (["Beginner-friendly"] if beginner else [])
            talks.append(
                {
                    "id": f"talk-g{n:02d}",
                    "title": title,
                    "abstract": abstract,
                    "start": f"{start // 60:02d}:{start % 60:02d}",
                    "end": f"{end // 60:02d}:{end % 60:02d}",
                    "room_id": room,
                    "floor": floor,
                    "topics": topics,
                    "access": {
                        "step_free_entrance": rng.choices(["confirmed", "unknown", "unavailable"], [8, 2, 1])[0],
                        "captions": rng.choices(["live_captioner", "automatic", "none", "unknown"], [3, 4, 2, 1])[0],
                        "slide_descriptions": rng.choices(["verified", "ai_draft", "none", "unknown"], [2, 3, 3, 2])[0],
                        "front_seating": rng.choices(["available", "unavailable", "unknown"], [5, 2, 3])[0],
                        "interpreter": rng.choices(["available", "unavailable", "unknown"], [1, 5, 4])[0],
                        "quiet_room_id": quiet,
                        "quiet_room_walk_minutes": walk,
                        "noise": rng.choice(["low", "medium", "high"]),
                        "crowd": rng.choice(["low", "medium", "high"]),
                    },
                }
            )
            break
    # Backups: another talk in the same slot window that shares a topic, if there is one.
    for t in talks:
        t["backup_talk_ids"] = []
    return talks


def with_backups(talks: list[dict]) -> list[dict]:
    for t in talks:
        peers = [
            o["id"]
            for o in talks
            if o["id"] != t["id"] and o["start"] == t["start"] and set(o["topics"]) & set(t["topics"])
        ]
        t["backup_talk_ids"] = peers[:1]
    return talks


if __name__ == "__main__":
    data = with_backups(build())
    OUT.write_text(json.dumps(data, indent=2) + "\n")
    print(f"wrote {len(data)} talks to {OUT}")
