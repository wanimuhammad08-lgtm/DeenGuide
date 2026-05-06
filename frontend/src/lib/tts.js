import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Browser SpeechSynthesis wrapper for hadith / answer recitation.
 * Tracks an "activeId" so multiple lists can show which item is speaking.
 */
export const useTTS = () => {
  const [speaking, setSpeaking] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const utterRef = useRef(null);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utterRef.current = null;
    setSpeaking(false);
    setActiveId(null);
  }, []);

  const speak = useCallback((text, { lang = "en-US", id = null, rate = 0.92, pitch = 1 } = {}) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return false;
    }
    if (!text || !text.trim()) return false;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    u.pitch = pitch;

    // Try to pick a matching voice
    const voices = window.speechSynthesis.getVoices();
    const target = voices.find((v) => v.lang === lang) || voices.find((v) => v.lang.startsWith(lang.split("-")[0]));
    if (target) u.voice = target;

    u.onend = () => {
      setSpeaking(false);
      setActiveId(null);
    };
    u.onerror = () => {
      setSpeaking(false);
      setActiveId(null);
    };
    utterRef.current = u;
    setSpeaking(true);
    setActiveId(id);
    window.speechSynthesis.speak(u);
    return true;
  }, []);

  const supported = typeof window !== "undefined" && !!window.speechSynthesis;

  return { speak, stop, speaking, activeId, supported };
};
