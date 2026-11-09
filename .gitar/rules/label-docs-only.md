---
title: "Docs-Only Labeling"
description: "Label PRs that only change documentation or evidence."
when: "PR is opened or receives new commits"
actions: "Add a docs label when every changed file is under docs/ or is a Markdown file"
integrations: ""
---

# Docs-Only Labeling

## When to Use This
- Every changed file is under `docs/` or ends in `.md`.

## How It Works
1. Check the changed file paths.
2. If they all match, add the `docs` label.

## Why This Matters
- Reviewers can skip the heavy checks and spot evidence updates quickly.
