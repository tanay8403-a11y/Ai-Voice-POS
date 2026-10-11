"""
Multi-language prompt lookup for voice responses. STT/TTS now lives in
ai/llm.py (OpenAI API) — this service only handles loading and formatting
strings from backend/languages/*.json for the voice assistant's spoken replies.
"""

import json
from pathlib import Path
from fastapi import HTTPException

LANGUAGES_DIR = Path(__file__).resolve().parent.parent / "languages"
_language_cache: dict[str, dict] = {}


def load_language_pack(lang_code: str) -> dict:
    if lang_code in _language_cache:
        return _language_cache[lang_code]

    lang_map = {"en": "english.json", "hi": "hindi.json", "mr": "marathi.json"}
    filename = lang_map.get(lang_code)
    if not filename:
        raise HTTPException(status_code=400, detail=f"Unsupported language code '{lang_code}'")

    file_path = LANGUAGES_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=500, detail=f"Language pack file missing: {filename}")

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    _language_cache[lang_code] = data
    return data


def translate_prompt_key(key: str, language: str = "en", **format_args) -> str:
    """
    Looks up a voice prompt string by key and formats it, e.g.:
        translate_prompt_key("item_added", "hi", item="चावल", quantity=2)
    """
    pack = load_language_pack(language)
    template = pack.get(key)
    if not template:
        template = load_language_pack("en").get(key, key)

    try:
        return template.format(**format_args)
    except (KeyError, IndexError):
        return template