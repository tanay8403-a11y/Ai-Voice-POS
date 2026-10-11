"""
Voice AI endpoints: start session (waits for "Start Billing" or
"Add to Inventory" wake phrase)
-> transcribe (multipart audio upload, Vosk) -> process (JSON transcript,
Gemini intent parsing) -> optional disambiguate -> end. Checkout
confirmation happens via /end with complete=true — voice alone never
finalizes payment without this explicit authenticated call.
"""

import os
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.config import settings
from backend.auth.authentication import get_current_user
from backend.auth.roles import require_any_staff
from backend.api.billing import _get_invoice_with_items, _serialize_invoice
from backend.models.user import User
from backend.services import voice_service
from backend.ai import llm
from backend.utils import speech as speech_util
from backend.schemas.voice import (
    StartSessionRequest, ProcessCommandRequest, DisambiguateRequest, EndSessionRequest,
)

router = APIRouter()

MAX_AUDIO_SIZE_BYTES = 15 * 1024 * 1024
ALLOWED_AUDIO_TYPES = {"audio/wav", "audio/x-wav", "audio/wave"}


@router.post("/start", dependencies=[Depends(require_any_staff)])
def start_session(
    payload: StartSessionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Creates a real InvoiceSession + linked draft invoice, in STARTED
    status. The session waits for "Start Billing" before accepting cart
    commands, or "Add to Inventory" before accepting a stock restock command.
    """
    return voice_service.start_session(
        db, user_id=current_user.id, language=payload.language, customer_id=payload.customer_id
    )


@router.post("/transcribe", dependencies=[Depends(require_any_staff)])
async def transcribe_audio(
    audio: UploadFile = File(...),
    session_id: str = Form(...),
    language: str = Form(default="en"),
    db: Session = Depends(get_db),
):
    """
    Accepts a WAV recording and returns the Vosk transcript. Must be
    16kHz mono 16-bit PCM WAV — the frontend recorder produces this
    format via AudioContext, not the browser's default MediaRecorder
    (which outputs webm/Opus, incompatible with Vosk).
    """
    if audio.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported audio type: {audio.content_type}. Must be WAV.")

    audio_bytes = await audio.read()
    if len(audio_bytes) > MAX_AUDIO_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Audio file too large (max 15MB)")
    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file")

    saved_path = speech_util.save_audio_file(audio_bytes, settings.AUDIO_DIR)
    try:
        transcript = voice_service.transcribe(db, session_id, saved_path, language=language)
    except voice_service.VoiceServiceError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except llm.LLMError as e:
        raise HTTPException(status_code=502, detail=f"Speech recognition failed: {e}")
    finally:
        if os.path.exists(saved_path):
            os.remove(saved_path)

    return {"session_id": session_id, "transcript": transcript}

@router.post("/process", dependencies=[Depends(require_any_staff)])
def process_command(payload: ProcessCommandRequest, db: Session = Depends(get_db)):
    # The command language is persisted on the InvoiceSession; clients do not
    # provide a second language value that could diverge from the session.
    try:
        result = voice_service.process_command(
            db, payload.session_id, payload.transcript
        )
        if result.get("invoice_id"):
            invoice = _get_invoice_with_items(db, result["invoice_id"])
            result["invoice"] = _serialize_invoice(invoice)
        return result
    except voice_service.VoicePermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except voice_service.VoiceServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))


    
@router.post("/disambiguate", dependencies=[Depends(require_any_staff)])
def disambiguate(payload: DisambiguateRequest, db: Session = Depends(get_db)):
    """Cashier/customer picks one of several product candidates returned by /process."""
    try:
        return voice_service.resolve_disambiguation(
            db, payload.session_id, payload.chosen_product_id, payload.quantity
        )
    except voice_service.VoiceServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/end", dependencies=[Depends(require_any_staff)])
def end_session(payload: EndSessionRequest, complete: bool = False, db: Session = Depends(get_db)):
    """complete=true finalizes the sale (checkout); complete=false (default) discards it."""
    try:
        return voice_service.end_session(db, payload.session_id, complete=complete)
    except voice_service.VoiceServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))