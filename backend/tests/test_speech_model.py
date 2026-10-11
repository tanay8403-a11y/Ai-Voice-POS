from unittest.mock import Mock

from backend.ai import llm


def test_english_speech_uses_indian_english_model_when_available(tmp_path, monkeypatch):
    indian_model = tmp_path / "vosk-model-en-in-0.5"
    indian_model.mkdir()
    fallback_model = tmp_path / "vosk-model-small-en-us-0.15"
    fallback_model.mkdir()
    load_model = Mock(return_value=object())

    monkeypatch.setattr(llm, "MODEL_PATHS", {"en": indian_model, "hi": tmp_path / "hi"})
    monkeypatch.setattr(llm, "FALLBACK_MODEL_PATHS", {"en": fallback_model})
    monkeypatch.setattr(llm, "Model", load_model)
    monkeypatch.setattr(llm, "KaldiRecognizer", Mock())
    monkeypatch.setattr(llm, "_vosk_models", {})

    llm._get_vosk_model("en-IN")

    load_model.assert_called_once_with(str(indian_model))


def test_english_speech_falls_back_when_indian_english_model_is_missing(tmp_path, monkeypatch):
    indian_model = tmp_path / "vosk-model-en-in-0.5"
    fallback_model = tmp_path / "vosk-model-small-en-us-0.15"
    fallback_model.mkdir()
    load_model = Mock(return_value=object())

    monkeypatch.setattr(llm, "MODEL_PATHS", {"en": indian_model, "hi": tmp_path / "hi"})
    monkeypatch.setattr(llm, "FALLBACK_MODEL_PATHS", {"en": fallback_model})
    monkeypatch.setattr(llm, "Model", load_model)
    monkeypatch.setattr(llm, "KaldiRecognizer", Mock())
    monkeypatch.setattr(llm, "_vosk_models", {})

    llm._get_vosk_model("en")

    load_model.assert_called_once_with(str(fallback_model))
