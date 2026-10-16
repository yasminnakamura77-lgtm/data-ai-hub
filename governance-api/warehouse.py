"""One shared, lazily-opened Snowflake connection."""

from __future__ import annotations

import asyncio
import os
import threading

import snowflake.connector

MAX_ROWS = int(os.getenv("QUERY_MAX_ROWS", "5000"))

_connection: snowflake.connector.SnowflakeConnection | None = None

# With externalbrowser SSO a connect is a browser window in front of a person,
# so this lock exists to make a page firing four queries at once cost one login
# instead of four.
_connect_lock = threading.Lock()


class QueryError(RuntimeError):
    """Snowflake refused the connection or the statement."""


def _connect() -> snowflake.connector.SnowflakeConnection:
    kwargs = {
        "account": os.getenv("SNOWFLAKE_ACCOUNT"),
        "user": os.getenv("SNOWFLAKE_USER"),
        "role": os.getenv("SNOWFLAKE_ROLE"),
        "warehouse": os.getenv("SNOWFLAKE_WAREHOUSE"),
        "database": os.getenv("SNOWFLAKE_DATABASE"),
        "schema": os.getenv("SNOWFLAKE_SCHEMA"),
        "client_session_keep_alive": True,
        "login_timeout": 60,
        "network_timeout": 60,
    }
    kwargs = {k: v for k, v in kwargs.items() if v}

    key_path = os.getenv("SNOWFLAKE_PRIVATE_KEY_PATH")
    if key_path:
        kwargs["private_key_file"] = key_path
    elif os.getenv("SNOWFLAKE_AUTHENTICATOR") == "externalbrowser":
        kwargs["authenticator"] = "externalbrowser"
        # Caches the login in the OS keyring, so you sign in once rather than
        # once per query.
        kwargs["client_store_temporary_credential"] = True
    elif os.getenv("SNOWFLAKE_PASSWORD"):
        kwargs["password"] = os.getenv("SNOWFLAKE_PASSWORD")
    else:
        raise QueryError(
            "No Snowflake login configured. Set SNOWFLAKE_AUTHENTICATOR=externalbrowser "
            "in backend/.env (see .env.example)."
        )

    return snowflake.connector.connect(**kwargs)


def _get_connection() -> snowflake.connector.SnowflakeConnection:
    global _connection
    if _connection is not None and not _connection.is_closed():
        return _connection
    with _connect_lock:
        if _connection is None or _connection.is_closed():
            _connection = _connect()
    return _connection


def _execute(sql: str) -> dict:
    con = _get_connection()
    with con.cursor(snowflake.connector.DictCursor) as cur:
        cur.execute(sql)
        columns = [d[0] for d in cur.description]
        rows = cur.fetchmany(MAX_ROWS + 1)
    truncated = len(rows) > MAX_ROWS
    return {"columns": columns, "rows": rows[:MAX_ROWS], "truncated": truncated}


async def run_query(sql: str) -> dict:
    try:
        return await asyncio.to_thread(_execute, sql)
    except snowflake.connector.errors.Error as exc:
        raise QueryError(str(exc)) from exc
