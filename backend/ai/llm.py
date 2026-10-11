"""
LLM wrapper using Google Gemini + Vosk speech recognition.

Supports exactly two voice languages:
- English: en
- Hindi: hi
"""

import json
import logging
import wave
from pathlib import Path
from typing import Optional

from google import genai
from tenacity import retry, stop_after_attempt, wait_exponential

try:
    from vosk import Model, KaldiRecognizer
except ImportError:
    Model = None
    KaldiRecognizer = None

from backend.config import settings

logger = logging.getLogger("ai.llm")

# ---------------------------------------------------------
# Gemini
# ---------------------------------------------------------

client = genai.Client(api_key=settings.GEMINI_API_KEY)

# ---------------------------------------------------------
# Vosk models
# ---------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"

MODEL_PATHS = {
    "en": Path(settings.VOSK_EN_MODEL_PATH) if settings.VOSK_EN_MODEL_PATH else MODELS_DIR / "vosk-model-en-in-0.5",
    "hi": MODELS_DIR / "vosk-model-small-hi-0.22",
}

FALLBACK_MODEL_PATHS = {
    "en": MODELS_DIR / "vosk-model-small-en-us-0.15",
}

_vosk_models = {}


def _normalize_language(language: str) -> str:
    """
    Only English and Hindi are supported.
    Anything else falls back to English.
    """
    language = (language or "en").strip().lower()

    if language in ("hi", "hin", "hindi"):
        return "hi"

    return "en"


def _get_vosk_model(language: str):
    """
    Load the required Vosk model lazily and cache it.
    """
    language = _normalize_language(language)

    if Model is None or KaldiRecognizer is None:
        raise LLMError("Vosk is not installed.")

    if language in _vosk_models:
        return _vosk_models[language]

    model_path = MODEL_PATHS[language]

    if not model_path.exists():
        fallback_path = FALLBACK_MODEL_PATHS.get(language)
        if fallback_path and fallback_path.exists():
            logger.warning(
                "Vosk Indian-English model not found at %s; falling back to US-English model at %s",
                model_path,
                fallback_path,
            )
            model_path = fallback_path
        else:
            raise LLMError(f"Vosk {language} model not found: {model_path}")

    logger.info(
        "Loading Vosk %s model from: %s",
        "Indian English" if language == "en" and model_path == MODEL_PATHS["en"] else language,
        model_path,
    )

    try:
        model = Model(str(model_path))
        _vosk_models[language] = model
        logger.info("Vosk %s model loaded successfully.", language)
        return model
    except Exception as e:
        logger.exception("Failed to load Vosk %s model", language)
        raise LLMError(
            f"Unable to load Vosk {language} model: {e}"
        ) from e


class LLMError(Exception):
    pass


# ---------------------------------------------------------
# Gemini command understanding
# ---------------------------------------------------------

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
)
def chat_completion(
    system_prompt: str,
    user_message: str,
    conversation_history: Optional[list] = None,
    temperature: float = 0.2,
    max_tokens: int = 500,
) -> str:
    """
    Send a prompt to Gemini.
    """

    history_text = ""

    if conversation_history:
        history_text = "\n".join(
            f"{turn.get('role', 'user').upper()}: {turn.get('content', '')}"
            for turn in conversation_history
        )

    prompt = f"""
SYSTEM:
{system_prompt}

CONVERSATION HISTORY:
{history_text}

USER:
{user_message}
"""

    try:
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
        )

        if not response.text:
            raise LLMError("Gemini returned an empty response.")

        return response.text.strip()

    except Exception as e:
        logger.exception("Gemini request failed")
        raise LLMError(str(e)) from e


# ---------------------------------------------------------
# Speech to text
# ---------------------------------------------------------

def transcribe_audio_openai(
    audio_file_path: str,
    language: str = "en",
) -> str:
    """
    Offline speech-to-text using the Vosk model
    corresponding to the selected language.
    """

    language = _normalize_language(language)
    vosk_model = _get_vosk_model(language)

    try:
        with wave.open(audio_file_path, "rb") as wf:

            # Vosk input validation
            if wf.getnchannels() != 1:
                raise LLMError(
                    "Audio must be mono (1 channel)."
                )

            if wf.getsampwidth() != 2:
                raise LLMError(
                    "Audio must be 16-bit PCM."
                )

            sample_rate = wf.getframerate()

            if sample_rate != 16000:
                logger.warning(
                    "Audio sample rate is %s Hz; expected 16000 Hz.",
                    sample_rate,
                )

            recognizer = KaldiRecognizer(
                vosk_model,
                sample_rate,
            )

            text_parts = []

            while True:
                data = wf.readframes(4000)

                if not data:
                    break

                if recognizer.AcceptWaveform(data):
                    result = json.loads(
                        recognizer.Result()
                    )

                    chunk = result.get("text", "").strip()

                    if chunk:
                        text_parts.append(chunk)

            final_result = json.loads(
                recognizer.FinalResult()
            )

            final_text = final_result.get("text", "").strip()

            if final_text:
                text_parts.append(final_text)

            transcript = " ".join(text_parts).strip()

            logger.info(
                "Vosk [%s] transcript: %s",
                language,
                transcript,
            )

            if not transcript:
                raise LLMError(
                    f"Could not recognize any {language} speech."
                )

            return transcript

    except LLMError:
        raise

    except Exception as e:
        logger.exception("Vosk transcription failed")
        raise LLMError(str(e)) from e


# ---------------------------------------------------------
# Text to speech
# ---------------------------------------------------------

def text_to_speech_openai(
    text: str,
    voice: str = "alloy",
) -> bytes:
    """
    Browser TTS is currently used by the frontend.
    This backend function remains a placeholder.
    """

    raise LLMError(
        "Backend text-to-speech is not configured. "
        "Frontend browser TTS is being used."
    )