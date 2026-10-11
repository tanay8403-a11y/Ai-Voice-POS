"""
Short-term conversation memory for the voice assistant, backed by Redis
(so it survives across gunicorn workers and container restarts — a
plain in-process dict would break in a multi-worker production deployment).
Each session (typically one checkout session at a till) keeps a rolling
window of recent turns for context (e.g. "add 2 more" referring to the last item).
"""

import json
import logging
from typing import List, Optional
import redis

from backend.config import settings

logger = logging.getLogger("ai.memory")

_redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

SESSION_TTL_SECONDS = 60 * 30  # 30 min of inactivity clears the session
MAX_HISTORY_TURNS = 6  # keep recent context small to control token cost


def _key(session_id: str) -> str:
    return f"voice_session:{session_id}"


def get_history(session_id: str) -> List[dict]:
    raw = _redis_client.get(_key(session_id))
    if not raw:
        return []
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.warning(f"Corrupt session history for {session_id}, resetting.")
        return []


def append_turn(session_id: str, role: str, content: str) -> None:
    """role is 'user' or 'assistant', matching OpenAI chat message format."""
    history = get_history(session_id)
    history.append({"role": role, "content": content})
    history = history[-MAX_HISTORY_TURNS:]  # keep only the most recent turns

    _redis_client.set(_key(session_id), json.dumps(history), ex=SESSION_TTL_SECONDS)


def clear_session(session_id: str) -> None:
    """Called on checkout/cancel_sale — starts a clean slate for the next customer."""
    _redis_client.delete(_key(session_id))


def get_cart_state(session_id: str) -> Optional[dict]:
    """
    Tracks the in-progress cart itself (product_id -> quantity/discount),
    separate from conversational text history, so the LLM's intent output
    can be applied against real state rather than re-derived from chat history.
    """
    raw = _redis_client.get(f"voice_cart:{session_id}")
    if not raw:
        return None
    return json.loads(raw)


def save_cart_state(session_id: str, cart: dict) -> None:
    _redis_client.set(f"voice_cart:{session_id}", json.dumps(cart), ex=SESSION_TTL_SECONDS)


def clear_cart_state(session_id: str) -> None:
    _redis_client.delete(f"voice_cart:{session_id}")