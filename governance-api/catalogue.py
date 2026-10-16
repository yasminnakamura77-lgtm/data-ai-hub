"""Mock data for the source catalogue (Data Quality / Trust & Governance / Ownership).

This is a prototype for how the catalogue *should* look and behave, not a
real metadata store. Everything below is hand-written sample data — nothing
here reads from Snowflake or any governance tool. Swap `_SOURCES` for a real
lookup (a metadata table, Collibra, Unity Catalog, whatever the real system
ends up being) when this moves past the prototype stage.

`dataReadiness` follows the reference hub's 3-stage model — Raw in Snowflake
→ Data Modeled → Semantic Layer, each 0..1 — separate from the plain
`readiness` status ('ready'/'pending'/'blocked') used for the header dot.

Issue reports are kept in memory (`_ISSUES`) so the page has something to
show after a submit. They are lost on restart — there is no database here,
on purpose (see CLAUDE.md).
"""

from __future__ import annotations

from typing import Any

_SOURCES: list[dict[str, Any]] = [
    {
        "id": "production-source",
        "code": "PRODUCTION_SOURCE",
        "description": "Production operational data source",
        "status": "active",
        "environment": "production",
        "readiness": "ready",
        "domain": "Operations",
        "system": "Data Tower",
        "tags": ["production", "operations", "critical"],
        "developer": "Maria Silva",
        "lastUpdated": "2026-09-23",
        "dataQuality": {
            "score": 96,
            "label": "Good",
            "metrics": [
                {"label": "Completeness", "value": 98},
                {"label": "Validity", "value": 99},
                {"label": "Freshness", "value": 91},
            ],
            "checksPassed": 4,
            "warnings": 1,
        },
        "dataReadiness": {"raw": 1, "modeled": 1, "semantic": 0.8},
        "freshness": {
            "lastUpdatedLabel": "Today 06:12",
            "expected": "Every 1 hour",
            "onTime": True,
            "nextRefreshLabel": "07:12",
        },
        "governance": {
            "status": "Compliant",
            "classification": "Internal",
            "dataOwner": "Data Ops",
            "access": "Restricted",
            "retention": "3 years",
            "controlsComplete": 4,
            "controlsTotal": 5,
        },
        "ownership": {
            "technicalOwner": "Maria Silva",
            "role": "Technical Owner",
            "team": "Data Engineering",
            "domain": "Operations",
            "lastDeployment": "2026-09-22",
            "schemaChange": "2026-09-18",
            "openIssues": 2,
            "pipelineHealth": "Healthy",
            "responsibilities": ["Source maintenance", "Monitoring", "Schema changes"],
        },
        "related": {
            "pipeline": {"readyPct": 92, "label": "Ready"},
            "glossary": {"termCount": 2},
            "aiApplications": {"count": 2},
            "lineage": {"upstreamCount": 2, "downstreamCount": 3},
        },
        "upstream": ["Plant ERP export", "Shift Scheduling API"],
        "glossaryTerms": [
            {
                "id": "gt-operational-event",
                "name": "Operational Event",
                "definition": "A logged action or state change captured from plant-floor systems.",
                "usedBy": ["Live Control Tower", "Ops nightly ETL", "Plant Efficiency model"],
            },
            {
                "id": "gt-data-tower",
                "name": "Data Tower",
                "definition": "The internal platform that hosts production-grade Snowflake sources for cross-team consumption.",
                "usedBy": ["Customer Orders", "fct_sales"],
            },
        ],
        "aiApplications": [
            {"name": "Plant Efficiency model", "stage": "In development"},
            {"name": "Ops Copilot", "stage": "Prototype"},
        ],
        "similarData": [
            {
                "name": "Plant Sensor Feed",
                "similarity": "Related",
                "sharedAttributes": ["Operations domain", "Same system owner"],
            },
        ],
        "impact": [
            {
                "name": "Live Control Tower dashboard",
                "type": "dashboard",
                "severity": "high",
                "note": "Reads this source directly for real-time KPIs — a schema change breaks the tiles with no warning.",
            },
            {
                "name": "Ops nightly ETL",
                "type": "pipeline",
                "severity": "high",
                "note": "Runs nightly at 02:00 and depends on current column names — a rename fails the job.",
            },
            {
                "name": "Plant Efficiency model",
                "type": "ai-asset",
                "severity": "medium",
                "note": "Retrains weekly on this data — schema drift degrades predictions silently instead of failing loudly.",
            },
        ],
    },
    {
        "id": "customer-orders",
        "code": "CUSTOMER_ORDERS",
        "description": "Order lifecycle events from the commercial platform",
        "status": "active",
        "environment": "production",
        "readiness": "ready",
        "domain": "Commercial",
        "system": "Sales Cloud",
        "tags": ["production", "commercial", "customer-data"],
        "developer": "Diego Fontes",
        "lastUpdated": "2026-09-21",
        "dataQuality": {
            "score": 91,
            "label": "Good",
            "metrics": [
                {"label": "Completeness", "value": 95},
                {"label": "Validity", "value": 93},
                {"label": "Freshness", "value": 86},
            ],
            "checksPassed": 5,
            "warnings": 0,
        },
        "dataReadiness": {"raw": 1, "modeled": 1, "semantic": 1},
        "freshness": {
            "lastUpdatedLabel": "Today 05:40",
            "expected": "Every 4 hours",
            "onTime": True,
            "nextRefreshLabel": "09:40",
        },
        "governance": {
            "status": "Compliant",
            "classification": "Confidential",
            "dataOwner": "Commercial Ops",
            "access": "Restricted",
            "retention": "7 years",
            "controlsComplete": 5,
            "controlsTotal": 5,
        },
        "ownership": {
            "technicalOwner": "Diego Fontes",
            "role": "Technical Owner",
            "team": "Data Engineering",
            "domain": "Commercial",
            "lastDeployment": "2026-09-19",
            "schemaChange": "2026-08-30",
            "openIssues": 0,
            "pipelineHealth": "Healthy",
            "responsibilities": ["Source maintenance", "Monitoring", "Access reviews"],
        },
        "related": {
            "pipeline": {"readyPct": 100, "label": "Ready"},
            "glossary": {"termCount": 2},
            "aiApplications": {"count": 1},
            "lineage": {"upstreamCount": 2, "downstreamCount": 3},
        },
        "upstream": ["Sales Cloud CRM", "Pricing Engine"],
        "glossaryTerms": [
            {
                "id": "gt-order-lifecycle",
                "name": "Order Lifecycle",
                "definition": "The sequence of states an order moves through from placement to fulfillment.",
                "usedBy": ["Sales Control Tower", "Order Forecasting pipeline"],
            },
            {
                "id": "gt-sold-to",
                "name": "Sold-to Customer",
                "definition": "The legal entity that places an order and is billed for it.",
                "usedBy": ["dim_customer", "fct_sales"],
            },
        ],
        "aiApplications": [{"name": "Churn Prediction model", "stage": "Production"}],
        "similarData": [
            {
                "name": "fct_sales",
                "similarity": "High similarity",
                "sharedAttributes": ["Customer-level", "Sales-level", "Governed"],
            },
            {
                "name": "Blacksmith",
                "similarity": "Related",
                "sharedAttributes": ["Promotional data"],
            },
        ],
        "impact": [
            {
                "name": "Sales Control Tower dashboard",
                "type": "dashboard",
                "severity": "high",
                "note": "Primary order feed for commercial reporting — a field removal breaks revenue tiles.",
            },
            {
                "name": "Order Forecasting pipeline",
                "type": "pipeline",
                "severity": "medium",
                "note": "Consumes this source hourly to update demand forecasts.",
            },
            {
                "name": "Churn Prediction model",
                "type": "ai-asset",
                "severity": "low",
                "note": "Uses order history as one of several inputs — resilient to minor schema changes.",
            },
        ],
    },
    {
        "id": "plant-sensor-feed",
        "code": "PLANT_SENSOR_FEED",
        "description": "Real-time sensor readings from plant floor equipment",
        "status": "active",
        "environment": "staging",
        "readiness": "pending",
        "domain": "Operations",
        "system": "IoT Gateway",
        "tags": ["staging", "operations", "iot"],
        "developer": "Priya Nair",
        "lastUpdated": "2026-09-15",
        "dataQuality": {
            "score": 78,
            "label": "Fair",
            "metrics": [
                {"label": "Completeness", "value": 82},
                {"label": "Validity", "value": 88},
                {"label": "Freshness", "value": 64},
            ],
            "checksPassed": 3,
            "warnings": 2,
        },
        "dataReadiness": {"raw": 1, "modeled": 0.5, "semantic": 0},
        "freshness": {
            "lastUpdatedLabel": "Yesterday 22:10",
            "expected": "Every 15 minutes",
            "onTime": False,
            "nextRefreshLabel": "Overdue",
        },
        "governance": {
            "status": "In review",
            "classification": "Internal",
            "dataOwner": "Plant Engineering",
            "access": "Restricted",
            "retention": "1 year",
            "controlsComplete": 2,
            "controlsTotal": 5,
        },
        "ownership": {
            "technicalOwner": "Priya Nair",
            "role": "Technical Owner",
            "team": "IoT Platform",
            "domain": "Operations",
            "lastDeployment": "2026-09-10",
            "schemaChange": "2026-09-10",
            "openIssues": 5,
            "pipelineHealth": "Degraded",
            "responsibilities": ["Source maintenance", "Sensor onboarding"],
        },
        "related": {
            "pipeline": {"readyPct": 61, "label": "In progress"},
            "glossary": {"termCount": 1},
            "aiApplications": {"count": 0},
            "lineage": {"upstreamCount": 1, "downstreamCount": 1},
        },
        "upstream": ["IoT Gateway firmware feed"],
        "glossaryTerms": [
            {
                "id": "gt-oee",
                "name": "OEE",
                "definition": "Overall Equipment Effectiveness — availability × performance × quality.",
                "usedBy": ["Plant Efficiency model"],
            },
        ],
        "aiApplications": [],
        "similarData": [
            {
                "name": "Production Source",
                "similarity": "Related",
                "sharedAttributes": ["Operations domain"],
            },
        ],
        "impact": [
            {
                "name": "Plant Efficiency model",
                "type": "ai-asset",
                "severity": "medium",
                "note": "Only consumer so far, still in staging — a break here is contained but delays the model's rollout.",
            },
        ],
    },
    {
        "id": "public-plant-directory",
        "code": "PUBLIC_PLANT_DIRECTORY",
        "description": "Published list of plant locations and general contact info",
        "status": "active",
        "environment": "production",
        "readiness": "ready",
        "domain": "Corporate",
        "system": "Data Tower",
        "tags": ["production", "reference"],
        "developer": "Maria Silva",
        "lastUpdated": "2026-08-30",
        "dataQuality": {
            "score": 99,
            "label": "Excellent",
            "metrics": [
                {"label": "Completeness", "value": 100},
                {"label": "Validity", "value": 100},
                {"label": "Freshness", "value": 97},
            ],
            "checksPassed": 5,
            "warnings": 0,
        },
        "dataReadiness": {"raw": 1, "modeled": 1, "semantic": 1},
        "freshness": {
            "lastUpdatedLabel": "Aug 30, 2026",
            "expected": "Monthly",
            "onTime": True,
            "nextRefreshLabel": "Sep 30, 2026",
        },
        "governance": {
            "status": "Compliant",
            "classification": "Public",
            "dataOwner": "Corporate Comms",
            "access": "Open",
            "retention": "Indefinite",
            "controlsComplete": 5,
            "controlsTotal": 5,
        },
        "ownership": {
            "technicalOwner": "Maria Silva",
            "role": "Technical Owner",
            "team": "Data Engineering",
            "domain": "Corporate",
            "lastDeployment": "2026-08-30",
            "schemaChange": "2026-06-12",
            "openIssues": 0,
            "pipelineHealth": "Healthy",
            "responsibilities": ["Source maintenance"],
        },
        "related": {
            "pipeline": {"readyPct": 100, "label": "Ready"},
            "glossary": {"termCount": 1},
            "aiApplications": {"count": 0},
            "lineage": {"upstreamCount": 1, "downstreamCount": 1},
        },
        "upstream": ["Facilities Master Data"],
        "glossaryTerms": [
            {
                "id": "gt-plant-location",
                "name": "Plant Location",
                "definition": "A physical processing facility with a public address.",
                "usedBy": ["Public plant locator page"],
            },
        ],
        "aiApplications": [],
        "similarData": [
            {
                "name": "Production Source",
                "similarity": "Related",
                "sharedAttributes": ["Data Tower system"],
            },
        ],
        "impact": [
            {
                "name": "Public plant locator page",
                "type": "dashboard",
                "severity": "low",
                "note": "Low-traffic reference page — a stale row is a minor inconvenience, not an outage.",
            },
        ],
    },
    {
        "id": "hr-compensation-extract",
        "code": "HR_COMPENSATION_EXTRACT",
        "description": "Payroll and compensation extract used for workforce reporting",
        "status": "inactive",
        "environment": "production",
        "readiness": "blocked",
        "domain": "People",
        "system": "Workday",
        "tags": ["production", "people", "restricted"],
        "developer": "Ana Beatriz",
        "lastUpdated": "2026-07-02",
        "dataQuality": {
            "score": 88,
            "label": "Good",
            "metrics": [
                {"label": "Completeness", "value": 90},
                {"label": "Validity", "value": 94},
                {"label": "Freshness", "value": 55},
            ],
            "checksPassed": 4,
            "warnings": 1,
        },
        "dataReadiness": {"raw": 1, "modeled": 0.5, "semantic": 0},
        "freshness": {
            "lastUpdatedLabel": "Jul 2, 2026",
            "expected": "Biweekly",
            "onTime": False,
            "nextRefreshLabel": "Paused",
        },
        "governance": {
            "status": "Compliant",
            "classification": "Restricted",
            "dataOwner": "People Analytics",
            "access": "Restricted",
            "retention": "7 years",
            "controlsComplete": 5,
            "controlsTotal": 5,
        },
        "ownership": {
            "technicalOwner": "Ana Beatriz",
            "role": "Technical Owner",
            "team": "People Analytics",
            "domain": "People",
            "lastDeployment": "2026-06-20",
            "schemaChange": "2026-05-14",
            "openIssues": 1,
            "pipelineHealth": "Paused",
            "responsibilities": ["Source maintenance", "Access reviews"],
        },
        "related": {
            "pipeline": {"readyPct": 40, "label": "Paused"},
            "glossary": {"termCount": 2},
            "aiApplications": {"count": 0},
            "lineage": {"upstreamCount": 1, "downstreamCount": 2},
        },
        "upstream": ["Workday Payroll Export"],
        "glossaryTerms": [
            {
                "id": "gt-comp-band",
                "name": "Compensation Band",
                "definition": "A salary range tier assigned to a job level.",
                "usedBy": ["Workforce Cost Reporting dashboard"],
            },
            {
                "id": "gt-pay-cycle",
                "name": "Pay Cycle",
                "definition": "The recurring period over which payroll is calculated and disbursed.",
                "usedBy": ["Payroll Reconciliation pipeline"],
            },
        ],
        "aiApplications": [],
        "similarData": [
            {
                "name": "Customer Orders",
                "similarity": "Related",
                "sharedAttributes": ["Restricted-tier classification"],
            },
        ],
        "impact": [
            {
                "name": "Workforce Cost Reporting dashboard",
                "type": "dashboard",
                "severity": "high",
                "note": "Finance-facing report reconciled against this extract every pay cycle.",
            },
            {
                "name": "Payroll Reconciliation pipeline",
                "type": "pipeline",
                "severity": "high",
                "note": "Currently paused with this source — resuming either without checking the other first will misalign figures.",
            },
        ],
    },
]

_SOURCES_BY_ID = {source["id"]: source for source in _SOURCES}

# In-memory only — see module docstring.
_ISSUES: list[dict[str, Any]] = []


def list_sources() -> list[dict[str, Any]]:
    """Summary fields only — enough for the catalogue table."""
    return [
        {
            "id": s["id"],
            "code": s["code"],
            "description": s["description"],
            "status": s["status"],
            "environment": s["environment"],
            "readiness": s["readiness"],
            "domain": s["domain"],
            "system": s["system"],
            "tags": s["tags"],
            "developer": s["developer"],
            "lastUpdated": s["lastUpdated"],
            "classification": s["governance"]["classification"],
        }
        for s in _SOURCES
    ]


def get_source(source_id: str) -> dict[str, Any] | None:
    return _SOURCES_BY_ID.get(source_id)


def log_issue(source_id: str, report: dict[str, Any]) -> dict[str, Any]:
    entry = {"sourceId": source_id, **report}
    _ISSUES.append(entry)
    return {"received": True, "queuePosition": len(_ISSUES)}


def list_issues() -> list[dict[str, Any]]:
    """Not wired to a page yet — useful from /docs while demoing the idea."""
    return _ISSUES
