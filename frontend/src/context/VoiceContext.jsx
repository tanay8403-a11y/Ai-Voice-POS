/**
 * Voice context — makes the voice assistant session available to any
 * component in the billing screen (mic controls, transcript display,
 * cart sync) without prop-drilling through every intermediate component.
 */

import { createContext, useContext } from "react";
import { useVoiceAssistant } from "../hooks/useVoiceAssistant";

const VoiceContext = createContext(null);

export function VoiceProvider({ children, language = "en" }) {
  const voice = useVoiceAssistant(language);
  return <VoiceContext.Provider value={voice}>{children}</VoiceContext.Provider>;
}

export function useVoiceContext() {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error("useVoiceContext must be used within a VoiceProvider");
  }
  return context;
}