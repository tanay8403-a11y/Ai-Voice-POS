/**
 * Voice AI service — matches the /voice/start -> /transcribe -> /process ->
 * /disambiguate -> /end flow. The session (and its linked invoice) is
 * created explicitly via startSession() rather than a lazily-created
 * client-side UUID.
 */

import api from "./api";

export async function startInvoiceSession(language = "en", customerId = null) {
  const response = await api.post("/voice/start", { language, customer_id: customerId });
  return response.data; // { session_id, invoice_id, greeting }
}

export async function transcribeAudio(audioBlob, sessionId, language = "en") {
  const formData = new FormData();
  formData.append("audio", audioBlob, "command.wav");   
  formData.append("session_id", sessionId);
  formData.append("language", language);

  const response = await api.post("/voice/transcribe", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function processCommand(sessionId, transcript) {
  const response = await api.post("/voice/process", { session_id: sessionId, transcript });
  return response.data;
  // { session_id, intent, matched_items, ambiguous_items, unresolved_items,
  //   requires_confirmation, spoken_response, cart_total }
}

export async function resolveDisambiguation(sessionId, spokenName, chosenProductId, quantity = 1) {
  const response = await api.post("/voice/disambiguate", {
    session_id: sessionId, spoken_name: spokenName, chosen_product_id: chosenProductId, quantity,
  });
  return response.data;
}

export async function endInvoiceSession(sessionId, complete = false) {
  const response = await api.post(`/voice/end?complete=${complete}`, { session_id: sessionId });
  return response.data; // { session_id, invoice_id, status }
}

/**
 * Records audio from the mic using MediaRecorder and resolves with a
 * controller exposing stop() to finish recording.
 */
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
  let audioContext;

  try {
    audioContext = new AudioContext();
    await audioContext.resume();
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    const silentGain = audioContext.createGain();
    silentGain.gain.value = 0;

    const chunks = [];
    processor.onaudioprocess = (e) => {
      chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };

    source.connect(processor);
    processor.connect(silentGain);
    silentGain.connect(audioContext.destination);

    return {
      stop: async () => {
        processor.disconnect();
        silentGain.disconnect();
        source.disconnect();
        stream.getTracks().forEach((track) => track.stop());

        try {
          const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
          if (totalLength === 0) {
            throw new Error("No audio was captured. Please try recording again.");
          }

          const merged = new Float32Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            merged.set(chunk, offset);
            offset += chunk.length;
          }

          const samples = await resampleAudio(
            merged,
            audioContext.sampleRate,
            16000
          );
          return encodeWAV(samples, 16000);
        } finally {
          await audioContext.close();
        }
      },
    };
  } catch (err) {
    stream.getTracks().forEach((track) => track.stop());
    if (audioContext && audioContext.state !== "closed") {
      await audioContext.close();
    }
    throw err;
  }
}

export async function startLiveRecording(onUtterance, onError) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
  let audioContext;

  try {
    audioContext = new AudioContext();
    await audioContext.resume();
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    const silentGain = audioContext.createGain();
    silentGain.gain.value = 0;
    const preRoll = [];
    let utteranceChunks = [];
    let inUtterance = false;
    let speechFrames = 0;
    let silenceFrames = 0;
    let utteranceFrames = 0;
    const sampleRate = audioContext.sampleRate;
    const silenceLimit = Math.ceil((sampleRate * 0.8) / 4096);
    const maxUtteranceFrames = Math.ceil((sampleRate * 12) / 4096);
    const minimumSpeechFrames = Math.ceil((sampleRate * 0.25) / 4096);

    const finishUtterance = async () => {
      const chunks = utteranceChunks;
      const validSpeech = speechFrames >= minimumSpeechFrames;
      utteranceChunks = [];
      inUtterance = false;
      speechFrames = 0;
      silenceFrames = 0;
      utteranceFrames = 0;

      if (!validSpeech || chunks.length === 0) return;

      try {
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const samples = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          samples.set(chunk, offset);
          offset += chunk.length;
        }

        const resampled = await resampleAudio(samples, sampleRate, 16000);
        await onUtterance(encodeWAV(resampled, 16000));
      } catch (err) {
        onError(err);
      }
    };

    processor.onaudioprocess = (event) => {
      const input = new Float32Array(event.inputBuffer.getChannelData(0));
      let energy = 0;
      for (let i = 0; i < input.length; i++) {
        energy += input[i] * input[i];
      }
      const rms = Math.sqrt(energy / input.length);
      const isSpeech = rms >= 0.012;

      if (!inUtterance && !isSpeech) {
        preRoll.push(input);
        if (preRoll.length > 3) preRoll.shift();
        return;
      }

      if (isSpeech && !inUtterance) {
        utteranceChunks = preRoll.splice(0);
        inUtterance = true;
      }

      if (inUtterance) {
        utteranceChunks.push(input);
        utteranceFrames++;
        if (isSpeech) {
          speechFrames++;
          silenceFrames = 0;
        } else {
          silenceFrames++;
        }

        if (
          silenceFrames >= silenceLimit ||
          utteranceFrames >= maxUtteranceFrames
        ) {
          void finishUtterance();
        }
      }
    };

    source.connect(processor);
    processor.connect(silentGain);
    silentGain.connect(audioContext.destination);

    return {
      stop: async (flush = true) => {
        processor.onaudioprocess = null;
        processor.disconnect();
        silentGain.disconnect();
        source.disconnect();
        stream.getTracks().forEach((track) => track.stop());

        try {
          if (flush) {
            await finishUtterance();
          }
        } finally {
          await audioContext.close();
        }
      },
    };
  } catch (err) {
    stream.getTracks().forEach((track) => track.stop());
    if (audioContext && audioContext.state !== "closed") {
      await audioContext.close();
    }
    throw err;
  }
}

async function resampleAudio(samples, sourceRate, targetRate) {
  if (sourceRate === targetRate) return samples;

  const OfflineAudioContextConstructor =
    window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OfflineAudioContextConstructor) {
    throw new Error("This browser cannot prepare audio for speech recognition.");
  }

  const targetLength = Math.ceil((samples.length * targetRate) / sourceRate);
  const offlineContext = new OfflineAudioContextConstructor(
    1,
    targetLength,
    targetRate
  );
  const inputBuffer = offlineContext.createBuffer(1, samples.length, sourceRate);
  inputBuffer.copyToChannel(samples, 0);

  const source = offlineContext.createBufferSource();
  source.buffer = inputBuffer;
  source.connect(offlineContext.destination);
  source.start();

  const outputBuffer = await offlineContext.startRendering();
  return outputBuffer.getChannelData(0);
}

function encodeWAV(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([view], { type: "audio/wav" });
}