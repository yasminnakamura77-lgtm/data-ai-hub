"""Refuses any SQL that is not a single read statement.

This is a seatbelt, not the real protection. What a query can actually do is
decided by the grants on your Snowflake role. Do not relax this.
"""

from __future__ import annotations

import re

ALLOWED_LEADING_KEYWORDS = {"select", "with", "show", "describe", "desc", "explain"}

FORBIDDEN_KEYWORDS = re.compile(
    r"\b(insert|update|delete|merge|truncate|create|drop|alter|grant|revoke"
    r"|call|copy|put|remove|undrop|use|set|unset|execute|begin|commit|rollback)\b",
    re.IGNORECASE,
)

_LINE_COMMENT = re.compile(r"--[^\n]*|//[^\n]*")
_BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.DOTALL)
_STRING_LITERAL = re.compile(r"'(?:[^']|'')*'")


class UnsafeSqlError(ValueError):
    pass


def assert_read_only(sql: str) -> None:
    stripped = _BLOCK_COMMENT.sub(" ", _LINE_COMMENT.sub(" ", sql)).strip()
    if not stripped:
        raise UnsafeSqlError("Empty query")

    if stripped.rstrip(";").count(";") > 0:
        raise UnsafeSqlError("Only one statement per query")

    leading = stripped.split(None, 1)[0].lower()
    if leading not in ALLOWED_LEADING_KEYWORDS:
        raise UnsafeSqlError(f"Only read statements are allowed (got '{leading}')")

    # String literals blanked first, so 'DROP' inside a value doesn't trip this.
    match = FORBIDDEN_KEYWORDS.search(_STRING_LITERAL.sub("''", stripped))
    if match:
        raise UnsafeSqlError(f"Forbidden keyword in query: {match.group(0).upper()}")
