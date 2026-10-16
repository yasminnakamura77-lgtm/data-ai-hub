from __future__ import annotations

import asyncio
import json
import os
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

_TIMEOUT_SECONDS = 60


_SYSTEM_PROMPT = (
    "You are an AI assistant inside a Data Governance Hub (a prototype). "
    "Help users understand data sources, data quality, ownership, classification, "
    "freshness, validity and governance issues. Be concise, clear and practical. "
    "If you are given source details, answer from them and say so when the answer "
    "is not in them. Do not invent facts."
    "If you are given a question that does not relates to data, you should not answer it."
    "Your name is Genie"
    "Do not use Markdown, Hashtags, asterisks, tables"
)


class AssistantError(RuntimeError):
    """The AI didn't answer."""


def _settings() -> tuple[str, str | None, str]:
    url = (os.getenv("OPENROUTE_URL") or "https://openrouter.ai/api/v1/chat/completions").strip()
    key = (os.getenv("OPENROUTE_API_KEY") or "").strip() or None
    model = (os.getenv("OPENROUTE_MODEL") or "openrouter/free").strip()
    return url, key, model


def status() -> dict[str, Any]:
    url, key, model = _settings()
    return {"key_found": bool(key), "url": url, "model": model}


def _call_openrouter(question: str, source: dict[str, Any] | None) -> str:
    url, key, model = _settings()
    if not key:
        raise AssistantError("OPENROUTE_API_KEY is not set in app/backend/.env")

    system = _SYSTEM_PROMPT
    if source:
        system += "\n\nContext from the prototype catalogue (DEMO METADATA ONLY). Never present it as live data, confirmed incidents or predictive AI confidence scores:\n" + json.dumps(source, default=str)[:12000]

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": question},
        ],
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=_TIMEOUT_SECONDS) as response:
            data = json.loads(response.read().decode("utf-8"))
        return data["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:300]
        raise AssistantError(f"OpenRouter answered {exc.code}: {detail}") from exc
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, KeyError, IndexError) as exc:
        raise AssistantError(f"{type(exc).__name__}: {exc}") from exc


async def ask(source: dict[str, Any] | None, question: str) -> dict[str, Any]:
    try:
        answer = await asyncio.to_thread(_call_openrouter, question, source)
        return {"answer": answer, "connected": True}
    except AssistantError as exc:
        return {
            "answer": f"(The AI could not answer right now: {exc})",
            "connected": False,
        }