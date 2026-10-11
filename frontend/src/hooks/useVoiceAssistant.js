/**
 * Voice assistant hook: keeps the microphone live, segments speech into
 * utterances, and sends each utterance through the transcription pipeline.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  startInvoiceSession,
  transcribeAudio,
  processCommand,
  resolveDisambiguation,
  endInvoiceSession,
  startLiveRecording,
} from "../services/voice";

export function useVoiceAssistant(language = "en") {
  const selectedLanguage = language === "hi" ? "hi" : "en";
  const [sessionId, setSessionId] = useState(null);
  const [invoiceId, setInvoiceId] = useState(null);
  const [invoiceSnapshot, setInvoiceSnapshot] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAwake, setIsAwake] = useState(false);
  const [transcript, setTranscript] = useState(null);
  const [messages, setMessages] = useState([]);
  const [matchedItems, setMatchedItems] = useState([]);
  const [invoiceRevision, setInvoiceRevision] = useState(0);
  const [spokenResponse, setSpokenResponse] = useState(null);
  const [cartTotal, setCartTotal] = useState(0);
  const [ambiguousItems, setAmbiguousItems] = useState({});
  const [unresolvedItems, setUnresolvedItems] = useState([]);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [error, setError] = useState(null);

  const recorderRef = useRef(null);
  const commandQueueRef = useRef(Promise.resolve());
  const sessionRef = useRef({ sessionId: null, invoiceId: null });

  const ensureSession = useCallback(async () => {
    if (sessionRef.current.sessionId) return sessionRef.current;
    const session = await startInvoiceSession(selectedLanguage);
    sessionRef.current = {
      sessionId: session.session_id,
      invoiceId: session.invoice_id,
    };
    setSessionId(session.session_id);
    setInvoiceId(session.invoice_id);
    setSpokenResponse(session.greeting);
    return sessionRef.current;
  }, [selectedLanguage]);

  const applyCommandResult = useCallback((result, userMessage = null) => {
    setInvoiceRevision((revision) => revision + 1);
    setSpokenResponse(result.spoken_response);
    setCartTotal(result.cart_total || 0);
    if (result.invoice_id) {
      sessionRef.current.invoiceId = result.invoice_id;
      setInvoiceId(result.invoice_id);
    }
    setInvoiceSnapshot(result.invoice || null);
    setAmbiguousItems(result.ambiguous_items || {});
    setUnresolvedItems(result.unresolved_items || []);
    setMatchedItems(result.matched_items || []);
    setRequiresConfirmation(!!result.requires_confirmation);
    if (result.intent === "start_billing" || result.intent === "inventory_mode") {
      setIsAwake(true);
    }
    setMessages((previous) => [
      ...previous,
      ...(userMessage ? [{ role: "user", content: userMessage }] : []),
      ...(result.spoken_response
        ? [{ role: "assistant", content: result.spoken_response }]
        : []),
    ].slice(-20));
  }, []);

  const processAudio = useCallback(
    async (audioBlob) => {
      setIsProcessing(true);
      try {
        const { sessionId: sid } = await ensureSession();
        const { transcript: text } = await transcribeAudio(
          audioBlob,
          sid,
          selectedLanguage
        );
        if (!text?.trim()) return;

        setTranscript(text);
        const result = await processCommand(sid, text);
        applyCommandResult(result, text);
      } catch (err) {
        setError(
          err.response?.data?.detail ||
            err.message ||
            "Voice command failed. Please try again."
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [applyCommandResult, ensureSession, selectedLanguage]
  );

  const beginRecording = useCallback(async () => {
    if (recorderRef.current) return;
    setError(null);

    try {
      await ensureSession();
      const recorder = await startLiveRecording(
        (audioBlob) => {
          commandQueueRef.current = commandQueueRef.current.then(() =>
            processAudio(audioBlob)
          );
          return commandQueueRef.current;
        },
        (err) => {
          setError(err.message || "Could not process recorded speech.");
        }
      );
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Microphone access denied or unavailable."
      );
    }
  }, [ensureSession, processAudio]);

  const stopAndSend = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;

    recorderRef.current = null;
    setIsRecording(false);
    try {
      await recorder.stop();
    } catch (err) {
      setError(err.message || "Could not stop the microphone.");
    }
  }, []);

  const sendTextCommand = useCallback(
    async (text) => {
      if (!text?.trim()) return;
      setIsProcessing(true);
      setTranscript(text);

      try {
        const { sessionId: sid } = await ensureSession();
        const result = await processCommand(sid, text);
        applyCommandResult(result, text);
        return result;
      } catch (err) {
        setError(err.response?.data?.detail || "Command failed. Please try again.");
      } finally {
        setIsProcessing(false);
      }
    },
    [applyCommandResult, ensureSession]
  );

  const pickDisambiguation = useCallback(
    async (spokenName, chosenProductId, quantity = 1) => {
      if (!sessionId) return;
      setIsProcessing(true);
      try {
        const result = await resolveDisambiguation(
          sessionId,
          spokenName,
          chosenProductId,
          quantity
        );
        setSpokenResponse(result.spoken_response);
        setCartTotal(result.cart_total || 0);
        setAmbiguousItems({});
        setInvoiceRevision((revision) => revision + 1);
        setMessages((previous) => [
          ...previous,
          { role: "assistant", content: result.spoken_response },
        ].slice(-20));
      } catch (err) {
        setError(err.response?.data?.detail || "Could not add the selected item.");
      } finally {
        setIsProcessing(false);
      }
    },
    [sessionId]
  );

  const resetInvoiceSession = useCallback(async () => {
    if (sessionRef.current.sessionId) {
      await endInvoiceSession(sessionRef.current.sessionId, false).catch(() => {});
    }
    sessionRef.current = { sessionId: null, invoiceId: null };
    setSessionId(null);
    setInvoiceId(null);
    setInvoiceSnapshot(null);
    setIsAwake(false);
    setTranscript(null);
    setMessages([]);
    setMatchedItems([]);
    setSpokenResponse(null);
    setCartTotal(0);
    setAmbiguousItems({});
    setUnresolvedItems([]);
    setRequiresConfirmation(false);
    setError(null);
  }, []);

  const confirmCheckout = useCallback(async () => {
    const activeSessionId = sessionRef.current.sessionId;
    if (!activeSessionId) return;
    await stopAndSend();
    setIsProcessing(true);
    try {
      const result = await endInvoiceSession(activeSessionId, true);
      sessionRef.current = { sessionId: null, invoiceId: null };
      setSessionId(null);
      setInvoiceId(null);
      setIsAwake(false);
      setTranscript(null);
      setMessages([]);
      setMatchedItems([]);
      setSpokenResponse(null);
      setCartTotal(0);
      setAmbiguousItems({});
      setUnresolvedItems([]);
      setRequiresConfirmation(false);
      setError(null);
      return result;
    } catch (err) {
      setError(err.response?.data?.detail || "Checkout failed.");
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [stopAndSend]);

  useEffect(() => {
    if (
      !spokenResponse ||
      !isAwake ||
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return;
    }

    const langMap = { en: "en-IN", hi: "hi-IN" };
    const utterance = new SpeechSynthesisUtterance(spokenResponse);
    utterance.lang = langMap[selectedLanguage];
    utterance.rate = 1;
    const finishSpeaking = () => setIsSpeaking(false);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = finishSpeaking;
    utterance.onerror = finishSpeaking;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);

    return () => {
      utterance.onstart = null;
      utterance.onend = null;
      utterance.onerror = null;
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    };
  }, [spokenResponse, selectedLanguage, isAwake]);

  useEffect(
    () => () => {
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (recorder) {
        recorder.stop(false).catch((err) => {
          console.error("Failed to release live voice recording:", err);
        });
      }
    },
    []
  );

  return {
    sessionId,
    invoiceId,
    invoiceSnapshot,
    isRecording,
    isProcessing,
    isSpeaking,
    isAwake,
    transcript,
    messages,
    matchedItems,
    invoiceRevision,
    spokenResponse,
    cartTotal,
    ambiguousItems,
    unresolvedItems,
    requiresConfirmation,
    error,
    beginRecording,
    stopAndSend,
    sendTextCommand,
    pickDisambiguation,
    confirmCheckout,
    resetInvoiceSession,
  };
}
