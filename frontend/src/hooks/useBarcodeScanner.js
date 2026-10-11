import { useState, useCallback, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { lookupByBarcode } from "../services/barcode";

export function useBarcodeScanner() {
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const codeReader = useRef(new BrowserMultiFormatReader());

  const startCameraScan = useCallback(async () => {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setScanning(true);
    } catch {
      setError("Unable to access camera.");
    }
  }, []);

  const stopCameraScan = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    codeReader.current.reset();
    setScanning(false);
  }, []);

  const captureAndDecode = useCallback(async () => {
    try {
      const result = await codeReader.current.decodeOnceFromVideoElement(
        videoRef.current
      );

      const barcode = result.getText();

      const product = await lookupByBarcode(barcode);

      setLastResult(product);

      return product;
    } catch (err) {
      setError("No barcode detected.");
      return null;
    }
  }, []);

  const lookupManualCode = useCallback(async (code) => {
    try {
      setError(null);

      const product = await lookupByBarcode(code);

      setLastResult(product);

      return product;
    } catch (err) {
      setError(err.response?.data?.detail || "Product not found");
      return null;
    }
  }, []);

  return {
    videoRef,
    scanning,
    lastResult,
    error,
    startCameraScan,
    stopCameraScan,
    captureAndDecode,
    lookupManualCode,
  };
}