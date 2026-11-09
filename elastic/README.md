# Elastic: Agent Builder and Workflow

1. Add `KIBANA_URL` to `.env` (Serverless project -> Kibana URL, like `https://<project>.kb.<region>.gcp.elastic.cloud`).
2. `python elastic/setup.py` registers three ES|QL tools and the "Curb Cut organizer assistant" agent.
   Open Kibana -> Agent Builder -> chat with it: "Which problems are being reported right now?"
3. Workflow: Kibana -> Workflows -> Create, paste `workflow.yaml`, set `consts.api_url` to your API host, save, enable.
   Test: post two reports from two device tokens (see docs/BACKEND.md); within a minute the change appears.
   The API also confirms reports on its own, so the demo works even if the Workflow is off.

The Python planner stays the source of truth for routing. The agent only reads public data (changes, reports, talks).
