# Voice recognition models

English speech recognition uses the Vosk `vosk-model-en-in-0.5` model, a
pre-trained generic Indian English model. It is not trained on this
application's users or recordings. The model archive is approximately 927 MiB
and is installed under `backend/models/vosk-model-en-in-0.5`.

To use a different compatible English Vosk model, set `VOSK_EN_MODEL_PATH` to
its extracted directory. If the configured Indian English model is missing,
the service logs a warning and uses the bundled small US English model instead.
Hindi continues to use `vosk-model-small-hi-0.22`.

The English model is selected for English sessions (including `en-IN`
language tags); browser speech synthesis uses `en-IN` for spoken English
responses. Vosk model source and setup details:
<https://alphacephei.com/vosk/models>.
