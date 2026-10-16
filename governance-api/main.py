"""Local backend: runs read-only SQL against Snowflake. No users, no database.

Add your own endpoints below when a page needs something more than a query.
"""

from __future__ import annotations

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

import ai_assistant  # noqa: E402
import catalogue  # noqa: E402
import insights  # noqa: E402
from guard import UnsafeSqlError, assert_read_only  # noqa: E402
from warehouse import QueryError, run_query  # noqa: E402

app = FastAPI(title="Vibecoding backend")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost:\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    sql: str = Field(min_length=1, max_length=20_000)


@app.get("/api/health")
async def health() -> dict:
    return {"ok": True}


@app.post("/api/query")
async def query(body: QueryRequest) -> dict:
    try:
        assert_read_only(body.sql)
    except UnsafeSqlError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        return await run_query(body.sql)
    except QueryError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


# --- Source catalogue (Data & AI hub prototype) -----------------------------
# Mock data only — see catalogue.py. Nothing below touches Snowflake.


def _get_source_or_404(source_id: str) -> dict:
    source = catalogue.get_source(source_id)
    if source is None:
        raise HTTPException(status_code=404, detail=f"No source '{source_id}'")
    return source


@app.get("/api/catalogue/sources")
async def catalogue_sources() -> dict:
    return {"sources": catalogue.list_sources()}


@app.get("/api/catalogue/sources/{source_id}")
async def catalogue_source(source_id: str) -> dict:
    return _get_source_or_404(source_id)


class AskAiRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4_000)


@app.post("/api/catalogue/sources/{source_id}/ask-ai")
async def catalogue_ask_ai(source_id: str, body: AskAiRequest) -> dict:
    source = _get_source_or_404(source_id)
    return await ai_assistant.ask(source, body.question)


# --- Hub Assistant (floating orb) -------------------------------------------


@app.get("/api/assistant/insights")
async def assistant_insights() -> dict:
    return insights.analyse()


class AssistantAskRequest(BaseModel):
    question: str


@app.post("/api/assistant/ask")
async def assistant_ask(body: AssistantAskRequest) -> dict:
    return await ai_assistant.ask({"catalogueContext": insights.analyse()}, body.question)


class ReportIssueRequest(BaseModel):
    kind: str = Field(min_length=1, max_length=100)
    message: str = Field(min_length=1, max_length=4_000)
    requester_name: str | None = Field(default=None, max_length=200)
    requester_email: str | None = Field(default=None, max_length=200)


@app.post("/api/catalogue/sources/{source_id}/report-issue")
async def catalogue_report_issue(source_id: str, body: ReportIssueRequest) -> dict:
    _get_source_or_404(source_id)
    return catalogue.log_issue(source_id, body.model_dump())
