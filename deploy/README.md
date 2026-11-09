# Deploy and observe

Flow: merge to `main` → **Release** workflow builds `curb-cut-api` and `curb-cut-web` → pushes to GHCR → pins the image
tags in `deploy/k8s` → **Argo CD** syncs the cluster → the app runs in the **Radar** namespace → traces go to **Dash0**.

## One-time setup (a person does these, once)
1. **GHCR visibility.** After the first Release run, make both packages public (GitHub → Packages → Package settings), or add an
   image pull secret.
2. **Repository variables** (Settings → Variables, not secrets, these are compiled into the browser bundle):
   `NEXT_PUBLIC_API_URL` (e.g. `https://<host>`), `NEXT_PUBLIC_API_MODE=live`, `NEXT_PUBLIC_OTEL_EXPORTER_URL` (Dash0 OTLP/HTTP
   traces URL or a same-origin forwarder).
3. **Secret in the cluster** (never in git):
   ```bash
   kubectl -n curb-cut create secret generic curb-cut-secrets \
     --from-literal=ES_URL=... --from-literal=ES_API_KEY=... --from-literal=ORGANIZER_KEY=... \
     --from-literal=OTEL_EXPORTER_OTLP_ENDPOINT=... \
     --from-literal=OTEL_EXPORTER_OTLP_HEADERS='Authorization=Bearer <dash0 token>'
   ```
4. **Host.** Replace `curbcut.example.com` in `deploy/k8s/ingress.yaml` and `CORS_ORIGINS` in `deploy/k8s/api.yaml`.
5. **Argo CD.** Edit `destination.namespace` in `deploy/argocd/application.yaml` to your Radar namespace, then
   `kubectl apply -f deploy/argocd/application.yaml`.

## Dash0
- The API exports spans when `OTEL_EXPORTER_OTLP_ENDPOINT` is set; the browser exports page-load and API-call spans when
  `NEXT_PUBLIC_OTEL_EXPORTER_URL` is set. Neither records profile data or search text.
- **SLO to create:** "Attendee re-plan under 30 seconds". Signal: the span `replan` (API) or `replan.client` (browser) duration.
  Target 99% under 30 s over 1 h. Plus an availability SLO on `/api/*` server spans (non-5xx).
- **Dashboard panels:** change announced → alerts sent (count of `changes.create` and `replan` spans), re-plan duration
  p50/p95, affected vs replanned (organizer summary), error rate by route.
- Save screenshots of the dashboard, the SLO and one trace in `docs/evidence/`.

## Radar
Join with the code from `docs/KEYS.md`, point it at the cluster, and ask it to investigate a real issue (for example a pod
restart or a slow `replan`). Save the investigation link or screenshot in `docs/evidence/`.

## Elasticsearch
`python data/generate.py` then `python data/ingest.py --reset` (needs `ES_URL`, `ES_API_KEY`). The API also ingests on startup
(`ES_AUTO_INGEST=0` turns that off). Search then reports `"backend": "elasticsearch"`.
