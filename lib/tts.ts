"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * Web Speech API text-to-speech. Picks a Thai voice for `th` and a default
 * voice otherwise. Safe no-op when the API is unavailable.
 */
export function speak(text: string, locale: "th" | "en" = "th") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const lang = locale === "th" ? "th-TH" : "en-US";
  utter.lang = lang;

  const voices = window.speechSynthesis.getVoices();
  const match =
    voices.find((v) => v.lang === lang) ??
    voices.find((v) => v.lang.startsWith(locale));
  if (match) utter.voice = match;

  utter.rate = 0.95;
  window.speechSynthesis.speak(utter);
}

export function isTtsSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Hook exposing a stable speak() bound to the current locale. */
export function useSpeak(locale: "th" | "en") {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isTtsSupported()) return;
    // Voices may load asynchronously.
    const load = () => setReady(true);
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () =>
      window.speechSynthesis.removeEventListener?.("voiceschanged", load);
  }, []);

  const say = useCallback((text: string) => speak(text, locale), [locale]);
  return { say, ready, supported: isTtsSupported() };
}
