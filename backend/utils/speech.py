"""
Audio file persistence helpers only. Actual STT/TTS goes through OpenAI's
API (backend/ai/llm.py) for the live deployment — this file only handles
file I/O and cleanup, no local model loading.
"""

import os
import uuid
from datetime import datetime
from pathlib import Path


def save_audio_file(audio_bytes: bytes, audio_dir: str) -> str:
    """Persists raw uploaded audio bytes to disk and returns the file path."""
    Path(audio_dir).mkdir(parents=True, exist_ok=True)

    filename = f"{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.webm"
    file_path = os.path.join(audio_dir, filename)

    with open(file_path, "wb") as f:
        f.write(audio_bytes)

    return file_path


def cleanup_old_audio_files(audio_dir: str, max_age_hours: int = 24) -> int:
    """Housekeeping: deletes leftover audio recordings older than max_age_hours. Returns count deleted."""
    if not os.path.isdir(audio_dir):
        return 0

    cutoff = datetime.utcnow().timestamp() - (max_age_hours * 3600)
    deleted = 0

    for filename in os.listdir(audio_dir):
        file_path = os.path.join(audio_dir, filename)
        if os.path.isfile(file_path) and os.path.getmtime(file_path) < cutoff:
            os.remove(file_path)
            deleted += 1

    return deleted