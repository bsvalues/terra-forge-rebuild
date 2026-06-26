import { useCallback, useRef, useEffect } from "react";

const SOUND_PREFERENCE_KEY = "terrafusion_notification_sound";

// Simple notification sounds using Web Audio API
function createNotificationSound(type: "success" | "error" | "warning" | "info") {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Different tones for different notification types
  const frequencies: Record<string, number[]> = {
    success: [523.25, 659.25, 783.99], // C5, E5, G5 - major chord
    error: [311.13, 369.99], // Eb4, F#4 - dissonant
    warning: [440, 349.23], // A4, F4
    info: [523.25, 587.33], // C5, D5
  };

  const freqs = frequencies[type] || frequencies.info;
  
  oscillator.type = "sine";
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

  const time = audioContext.currentTime;
  freqs.forEach((freq, index) => {
    oscillator.frequency.setValueAtTime(freq, time + index * 0.1);
  });

  gainNode.gain.exponentialRampToValueAtTime(0.01, time + freqs.length * 0.1 + 0.2);

  oscillator.start(time);
  oscillator.stop(time + freqs.length * 0.1 + 0.3);
}

export function useNotificationSound() {
  const soundEnabledRef = useRef(true);

  useEffect(() => {
    const stored = localStorage.getItem(SOUND_PREFERENCE_KEY);
    if (stored !== null) {
      soundEnabledRef.current = stored === "true";
    }
  }, []);

  const playSound = useCallback((type: "success" | "error" | "warning" | "info") => {
    if (!soundEnabledRef.current) return;

    try {
      createNotificationSound(type);
    } catch (e) {
      // Audio API not available or blocked
      console.debug("Could not play notification sound:", e);
    }
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    soundEnabledRef.current = enabled;
    localStorage.setItem(SOUND_PREFERENCE_KEY, String(enabled));
  }, []);

  const isSoundEnabled = useCallback(() => {
    return soundEnabledRef.current;
  }, []);

  return {
    playSound,
    setSoundEnabled,
    isSoundEnabled,
  };
}
