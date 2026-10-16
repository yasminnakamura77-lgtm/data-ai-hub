"""Thin local API for the Data & AI Hub prototype.

Serves REAL data from the existing Flask app's portfolio.db (86 catalogue
sources + 1,803 dbt nodes with real `depends_on` + 846 source->dbt mappings) so
the React prototype's Data-sources and Lineage screens run on live data instead
of mock. Stdlib only (http.server + sqlite3) — no FastAPI/pip needed behind the
iboss proxy. This is a dev stand-in; the production version is the FastAPI
`app/modules/data_ai_hub/` module in pilgrims-backend-services.

Run:  python dev-api/serve.py   ->  http://127.0.0.1:8099
Endpoints:
  GET  /api/health
  GET  /api/data-sources           list (86 active catalogue sources)
  GET  /api/data-sources/<id>      one source + its mapped dbt models
  GET  /api/lineage?source_id=<id> real dbt lineage neighborhood for that source
  POST /api/requests               submit a new data-source request (Hub intake)
  GET  /api/metrics                list Hub-authored metrics (hub_metrics table)
  GET  /api/metrics/<id>           one Hub-authored metric
  POST /api/metrics                create a metric (always lands as 'draft')
  PUT  /api/metrics/<id>            update a metric (incl. draft -> hub-certified)
"""
import json
import os
import re
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

DB_PATH = os.environ.get(
    "PORTFOLIO_DB",
    r"C:\Users\lyu\VS Projects\portfolio-intelligence\portfolio.db",
)
PORT = int(os.environ.get("HUB_API_PORT", "8099"))


def connect():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def area_of(vertical):
    v = (vertical or "").strip()
    return {"Finance": "Shared", "Corp": "Shared", "Corporate": "Shared", "": "Shared"}.get(v, v)


def stage(v):
    s = (v or "").strip().lower()
    return 1.0 if s == "yes" else 0.5 if s == "partial" else 0.0


def readiness_of(row):
    return {
        "raw": stage(row["raw_in_snowflake"]),
        "modeled": stage(row["data_modeled"]),
        "semantic": stage(row["semantic_layer"]),
    }


CERT_TAG = {"verified": "Certified", "review": "In review", "draft": "Draft", "deprecated": "Deprecated"}


def source_dict(row, mapped_count):
    tags = []
    ct = CERT_TAG.get((row["certification_status"] or "").strip().lower())
    if ct:
        tags.append(ct)
    return {
        "id": f"di-{row['id']}",
        "name": row["source"],
        "kind": "source",
        "area": area_of(row["business_vertical"]),
        "layerLabel": "Catalogue source",
        "readiness": readiness_of(row),
        "owner": row["owner"] or "—",
        "description": (row["content"] or row["notes"] or "").strip(),
        "tags": tags,
        "lifecycle": row["lifecycle_status"] or "",
        "mappedCount": mapped_count,
    }


def _slug(text):
    """Duplicated from portfolio-intelligence's tools/reload_from_summary.py
    (_slug/integration_key) rather than imported — that module does `import
    openpyxl` at module scope, which dev-api can't pull in (stdlib-only)."""
    return re.sub(r"[^a-z0-9]+", "-", str(text or "").strip().lower()).strip("-")


def integration_key(vertical, source, content=""):
    return f"{_slug(vertical)}|{_slug(source)}|{_slug(content)}"


def create_request(conn, body):
    source = (body.get("source") or "").strip()
    if not source:
        return {"error": "source is required"}, 400
    vertical = (body.get("business_vertical") or "").strip()
    content = (body.get("content") or "").strip()
    justification = (body.get("business_justification") or "").strip()
    target_quarter = (body.get("target_quarter") or "").strip()
    requested_by = (body.get("requested_by") or "").strip()

    key = integration_key(vertical, source, content)
    exists = conn.execute(
        "SELECT id FROM data_integrations WHERE integration_key = ?", (key,)
    ).fetchone()
    if exists:
        return {"error": "duplicate", "id": exists["id"]}, 409

    cur = conn.execute(
        """INSERT INTO data_integrations
           (business_vertical, source, content, integration_key, lifecycle_status,
            requested_by, business_justification, target_quarter, progress_pct,
            in_bw, raw_in_snowflake, data_modeled, semantic_layer)
           VALUES (?,?,?,?, 'requested', ?,?,?, 0, '', '', '', '')""",
        (vertical, source, content, key, requested_by, justification, target_quarter),
    )
    conn.commit()
    return {"ok": True, "id": cur.lastrowid}, 201


def metric_dict(row):
    return {
        "id": f"hm-{row['id']}",
        "name": row["name"],
        "area": row["area"],
        "lifecycle": row["lifecycle"],
        "definition": row["definition"] or "",
        "calculation": row["calculation"] or "",
        "owner": row["owner"] or "",
        "sme": row["sme"] or "",
        "unit": row["unit"] or None,
        "value": row["value"] or None,
        "sources": [s.strip() for s in (row["sources"] or "").split(",") if s.strip()],
        "updated": (row["updated_at"] or "")[:10],
    }


def list_metrics(conn):
    rows = conn.execute("SELECT * FROM hub_metrics ORDER BY updated_at DESC").fetchall()
    return [metric_dict(r) for r in rows]


def one_metric(conn, mid):
    row = conn.execute("SELECT * FROM hub_metrics WHERE id = ?", (mid,)).fetchone()
    return metric_dict(row) if row else None


def _sources_text(body):
    s = body.get("sources")
    if isinstance(s, list):
        return ", ".join(x.strip() for x in s if str(x).strip())
    return (s or "").strip()


def create_metric(conn, body):
    name = (body.get("name") or "").strip()
    area = (body.get("area") or "").strip()
    if not name or not area:
        return {"error": "name and area are required"}, 400
    cur = conn.execute(
        """INSERT INTO hub_metrics
           (name, area, lifecycle, definition, calculation, owner, sme, unit, value,
            sources, updated_by)
           VALUES (?,?, 'draft', ?,?,?,?,?,?,?,?)""",
        (name, area, (body.get("definition") or "").strip(), (body.get("calculation") or "").strip(),
         (body.get("owner") or "").strip(), (body.get("sme") or "").strip(),
         (body.get("unit") or "").strip() or None, (body.get("value") or "").strip() or None,
         _sources_text(body), (body.get("updatedBy") or "").strip()),
    )
    conn.commit()
    return {"ok": True, "id": cur.lastrowid}, 201


def update_metric(conn, mid, body):
    row = conn.execute("SELECT id FROM hub_metrics WHERE id = ?", (mid,)).fetchone()
    if not row:
        return {"error": "not found"}, 404
    lifecycle = body.get("lifecycle")
    if lifecycle is not None and lifecycle not in ("draft", "hub-certified"):
        return {"error": "lifecycle must be 'draft' or 'hub-certified'"}, 400

    fields, args = [], []
    for key, col in [
        ("name", "name"), ("area", "area"), ("definition", "definition"),
        ("calculation", "calculation"), ("owner", "owner"), ("sme", "sme"),
        ("unit", "unit"), ("value", "value"), ("updatedBy", "updated_by"),
    ]:
        if key in body:
            fields.append(f"{col} = ?")
            args.append((body.get(key) or "").strip() or None)
    if "sources" in body:
        fields.append("sources = ?")
        args.append(_sources_text(body))
    if lifecycle is not None:
        fields.append("lifecycle = ?")
        args.append(lifecycle)
    fields.append("updated_at = datetime('now')")

    conn.execute(f"UPDATE hub_metrics SET {', '.join(fields)} WHERE id = ?", (*args, mid))
    conn.commit()
    return {"ok": True}, 200


def list_sources(conn):
    rows = conn.execute(
        "SELECT * FROM data_integrations WHERE COALESCE(lifecycle_status,'') != 'retired' "
        "ORDER BY business_vertical, source"
    ).fetchall()
    counts = dict(conn.execute(
        "SELECT data_integration_id, COUNT(*) FROM integration_asset_map "
        "WHERE dbt_unique_id IS NOT NULL GROUP BY data_integration_id"
    ).fetchall())
    return [source_dict(r, counts.get(r["id"], 0)) for r in rows]


def one_source(conn, sid):
    row = conn.execute("SELECT * FROM data_integrations WHERE id = ?", (sid,)).fetchone()
    if not row:
        return None
    mapped = conn.execute(
        "SELECT m.dbt_unique_id, m.confidence, n.name, n.schema_name, n.resource_type "
        "FROM integration_asset_map m LEFT JOIN dbt_nodes n ON n.unique_id = m.dbt_unique_id "
        "WHERE m.data_integration_id = ? AND m.dbt_unique_id IS NOT NULL "
        "ORDER BY m.confidence DESC", (sid,)
    ).fetchall()
    d = source_dict(row, len(mapped))
    d["mappedNodes"] = [
        {"unique_id": r["dbt_unique_id"], "name": r["name"] or r["dbt_unique_id"].split(".")[-1],
         "schema": r["schema_name"], "confidence": round(r["confidence"] or 0, 2)}
        for r in mapped[:15]
    ]
    return d


def load_dbt(conn):
    info, rev = {}, {}
    for r in conn.execute(
        "SELECT unique_id, resource_type, name, schema_name, materialization, description, depends_on_json FROM dbt_nodes"
    ):
        info[r["unique_id"]] = r
        for dep in json.loads(r["depends_on_json"] or "[]"):
            rev.setdefault(dep, []).append(r["unique_id"])
    return info, rev


def dbt_node(uid, info):
    r = info.get(uid)
    if not r:
        short = uid.split(".")[-1]
        return {"id": uid, "label": short, "sub": "dbt (unresolved)", "kind": "model"}
    kind = "source" if r["resource_type"] == "source" else "model"
    sub = (r["schema_name"] or r["materialization"] or r["resource_type"] or "").lower()
    return {"id": uid, "label": r["name"] or uid.split(".")[-1], "sub": sub, "kind": kind,
            "desc": (r["description"] or "").strip() or None}


def lineage_for_source(conn, sid, max_nodes=44, down_hops=2):
    row = conn.execute("SELECT * FROM data_integrations WHERE id = ?", (sid,)).fetchone()
    if not row:
        return {"nodes": [], "edges": [], "focusId": ""}
    focus = f"di-{sid}"
    nodes = {focus: {"id": focus, "label": row["source"], "sub": "catalogue source", "kind": "source",
                     "readiness": readiness_of(row), "desc": (row["content"] or "").strip() or None}}
    edges = []
    seeds = [r["dbt_unique_id"] for r in conn.execute(
        "SELECT dbt_unique_id FROM integration_asset_map WHERE data_integration_id = ? "
        "AND dbt_unique_id IS NOT NULL ORDER BY confidence DESC LIMIT 8", (sid,))]
    if not seeds:
        focus_node = dict(nodes[focus])
        focus_node["layer"] = 0
        return {"nodes": [focus_node], "edges": [], "focusId": focus, "unmapped": True}

    info, rev = load_dbt(conn)
    kept = set()
    frontier = []
    for s in seeds:
        if s in info and s not in kept:
            kept.add(s)
            frontier.append((s, 0))
            edges.append({"from": focus, "to": s})
    # BFS downstream via reverse deps
    while frontier:
        uid, hop = frontier.pop(0)
        if hop >= down_hops or len(kept) >= max_nodes:
            continue
        for child in rev.get(uid, []):
            if child not in kept and len(kept) < max_nodes:
                kept.add(child)
                frontier.append((child, hop + 1))
    # materialize dbt nodes
    for uid in kept:
        nodes[uid] = dbt_node(uid, info)
    # real dbt edges among kept nodes
    for uid in kept:
        for dep in json.loads((info[uid]["depends_on_json"] if uid in info else "[]") or "[]"):
            if dep in kept:
                edges.append({"from": dep, "to": uid})
    # layers = BFS distance from focus over the edge set
    adj = {}
    for e in edges:
        adj.setdefault(e["from"], []).append(e["to"])
    layer = {focus: 0}
    q = [focus]
    while q:
        u = q.pop(0)
        for v in adj.get(u, []):
            if v not in layer:
                layer[v] = layer[u] + 1
                q.append(v)
    out_nodes = []
    for nid, n in nodes.items():
        n = dict(n)
        n["layer"] = layer.get(nid, 1)
        out_nodes.append(n)
    return {"nodes": out_nodes, "edges": edges, "focusId": focus,
            "unmapped": False, "truncated": len(kept) >= max_nodes}


class Handler(BaseHTTPRequestHandler):
    def _send(self, obj, code=200):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass  # quiet

    def do_GET(self):
        u = urlparse(self.path)
        path, qs = u.path, parse_qs(u.query)
        try:
            conn = connect()
            try:
                if path == "/api/health":
                    return self._send({"ok": True, "db": DB_PATH})
                if path == "/api/data-sources":
                    return self._send(list_sources(conn))
                if path.startswith("/api/data-sources/"):
                    sid = int(path.rsplit("/", 1)[-1])
                    d = one_source(conn, sid)
                    return self._send(d) if d else self._send({"error": "not found"}, 404)
                if path == "/api/lineage":
                    sid = int(qs.get("source_id", ["0"])[0])
                    return self._send(lineage_for_source(conn, sid))
                if path == "/api/metrics":
                    return self._send(list_metrics(conn))
                if path.startswith("/api/metrics/"):
                    mid = int(path.rsplit("/", 1)[-1].replace("hm-", ""))
                    m = one_metric(conn, mid)
                    return self._send(m) if m else self._send({"error": "not found"}, 404)
                return self._send({"error": "not found", "path": path}, 404)
            finally:
                conn.close()
        except Exception as e:  # noqa: BLE001
            self._send({"error": str(e)}, 500)

    def _read_json_body(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        return json.loads(raw or b"{}")

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            body = self._read_json_body()
        except Exception as e:  # noqa: BLE001
            return self._send({"error": f"invalid JSON body: {e}"}, 400)
        try:
            conn = connect()
            try:
                if path == "/api/requests":
                    obj, code = create_request(conn, body)
                    return self._send(obj, code)
                if path == "/api/metrics":
                    obj, code = create_metric(conn, body)
                    return self._send(obj, code)
                return self._send({"error": "not found", "path": path}, 404)
            finally:
                conn.close()
        except Exception as e:  # noqa: BLE001
            self._send({"error": str(e)}, 500)

    def do_PUT(self):
        path = urlparse(self.path).path
        try:
            body = self._read_json_body()
        except Exception as e:  # noqa: BLE001
            return self._send({"error": f"invalid JSON body: {e}"}, 400)
        try:
            conn = connect()
            try:
                if path.startswith("/api/metrics/"):
                    mid = int(path.rsplit("/", 1)[-1].replace("hm-", ""))
                    obj, code = update_metric(conn, mid, body)
                    return self._send(obj, code)
                return self._send({"error": "not found", "path": path}, 404)
            finally:
                conn.close()
        except Exception as e:  # noqa: BLE001
            self._send({"error": str(e)}, 500)


if __name__ == "__main__":
    print(f"Hub dev API on http://127.0.0.1:{PORT}  (db: {DB_PATH})")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
