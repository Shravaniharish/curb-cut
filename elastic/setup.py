"""Register the Agent Builder tools and agent in Kibana.  python elastic/setup.py

Needs KIBANA_URL (your Serverless project's Kibana URL) and ES_API_KEY (an API key with Kibana access).
Safe to rerun: existing items are updated.
"""

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

KIBANA = os.environ.get("KIBANA_URL", "").rstrip("/")
KEY = os.environ.get("ES_API_KEY", "")
if not KIBANA or not KEY:
    sys.exit("Set KIBANA_URL and ES_API_KEY first.")


def call(method: str, path: str, body: dict | None = None) -> int:
    req = urllib.request.Request(
        f"{KIBANA}{path}",
        data=json.dumps(body).encode() if body else None,
        method=method,
        headers={"Authorization": f"ApiKey {KEY}", "kbn-xsrf": "true", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status
    except urllib.error.HTTPError as e:
        print(f"  {method} {path} -> {e.code} {e.read().decode()[:300]}")
        return e.code


spec = json.loads((Path(__file__).parent / "agent.json").read_text())
for tool in spec["tools"]:
    code = call("POST", "/api/agent_builder/tools", tool)
    if code == 409:
        update = {k: v for k, v in tool.items() if k not in ("id", "type")}
        code = call("PUT", f"/api/agent_builder/tools/{tool['id']}", update)
    print("tool", tool["id"], "ok" if code < 300 else "FAILED")
agent = spec["agent"]
code = call("POST", "/api/agent_builder/agents", agent)
if code == 409:
    code = call("PUT", f"/api/agent_builder/agents/{agent['id']}", {k: v for k, v in agent.items() if k != "id"})
print("agent", agent["id"], "ok" if code < 300 else "FAILED")
