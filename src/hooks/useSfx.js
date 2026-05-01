import React from "react";

const STORAGE_KEY = "smpg:sfxMuted";

const readMuted = () => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

const prefersReducedMotion = () => typeof window !== "undefined"
  && !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

export const useSfx = () => {
  const audioCtxRef = React.useRef(null);
  const [muted, setMutedState] = React.useState(readMuted);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setMutedState(readMuted());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setMuted = React.useCallback((next) => {
    setMutedState(!!next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // ignore quota / private mode
    }
  }, []);

  const play = React.useCallback((type) => {
    if (typeof window === "undefined") return;
    if (muted || prefersReducedMotion()) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});

      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      master.connect(ctx.destination);

      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      o1.type = "triangle";
      o2.type = "sine";

      const base = type === "apply" ? 220 : type === "generate" ? 196 : 174;
      o1.frequency.setValueAtTime(base * 2.0, now);
      o1.frequency.exponentialRampToValueAtTime(base * 2.8, now + 0.12);
      o2.frequency.setValueAtTime(base * 3.2, now);
      o2.frequency.exponentialRampToValueAtTime(base * 2.4, now + 0.16);

      const g1 = ctx.createGain();
      const g2 = ctx.createGain();
      g1.gain.value = 0.55;
      g2.gain.value = 0.35;
      o1.connect(g1);
      o2.connect(g2);
      g1.connect(master);
      g2.connect(master);

      o1.start(now);
      o2.start(now);
      o1.stop(now + 0.24);
      o2.stop(now + 0.24);
    } catch {
      // Ignore audio failures (autoplay policy, unsupported, etc.)
    }
  }, [muted]);

  return { play, muted, setMuted };
};
