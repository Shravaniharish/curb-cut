---
title: "Evidence Reminder"
description: "Remind authors to add evidence for sponsor-track features."
when: "PR touches api/app/telemetry.py, deploy/, or .gitar/"
actions: "Comment asking the author to add a screenshot or link under docs/evidence/ and mention it in the PR description"
integrations: ""
---

# Evidence Reminder

## When to Use This
- The PR changes telemetry, deployment or review configuration.

## How It Works
1. Check whether the PR adds or updates a file under `docs/evidence/`.
2. If not, post a short comment asking for a screenshot, trace link or PR link.

## Why This Matters
- Judges score evidence. It is easiest to capture while the work happens.
