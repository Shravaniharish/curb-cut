# Keys and accounts

Never commit keys. Use `.env` (in `.gitignore`) locally and Kubernetes Secrets on the cluster. One person creates each key and shares it privately (direct message).

| What | Needed | Details |
|---|---|---|
| Elasticsearch Serverless | Yes | Sign up via https://ela.st/hack-kubecon, create a Serverless Elasticsearch project, copy the endpoint URL and create an API key (shown once). Jina embeddings are included. |
| Dash0 | Yes (track) | Trial account; auth token with ingest permission and your region's OTLP endpoint (copy exact values from Dash0's setup page). Separate token for MCP if used. |
| Radar | Yes (deploy) | No API key. Join code `radar-slc` at join.cnh.radarhq.io, then app.radarhq.io; authenticate the MCP in the browser. |
| Gitar | Yes | No key. Install the GitHub app at app.gitar.ai for the repo. |
| GHCR push | Yes (deploy) | Use the built-in `GITHUB_TOKEN` with `packages: write` in the workflow. |
| Argo CD | Yes (deploy) | Provided through Radar / the starter repo. |
| Anthropic key | Optional | Only for the AI summary in "Catch me up". Fallback: last 3 transcript lines. |
| WeMakeDevs account | Yes | One person creates the team and invites the others. |

## `.env` template
```
ELASTIC_URL=
ELASTIC_API_KEY=
OTEL_EXPORTER_OTLP_ENDPOINT=
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer <dash0 token>
ANTHROPIC_API_KEY=
```

If a key leaks: create a new one, delete the old one, tell the group.
