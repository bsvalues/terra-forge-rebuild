import { useMemo } from "react";

interface QualityGates {
  enableGlass: boolean;
  enableMotion: boolean;
  enableSignal: boolean;
  isLowPower: boolean;
}

/**
 * Detects hardware capabilities and user preferences
 * to enforce performance quality gates.
 */
export function useQualityGates(): QualityGates {
  return useMemo(() => {
    const nav = globalThis.navigator as any;

    const lowCores = (nav?.hardwareConcurrency ?? 8) < 4;
    const lowMemory = (nav?.deviceMemory ?? 8) < 4;
    const noBlur = typeof CSS !== "undefined"
      ? !CSS.supports("backdrop-filter", "blur(1px)")
      : false;

    const prefersReducedMotion =
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;

    const prefersReducedTransparency =
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-transparency: reduce)").matches
        : false;

    const isLowPower = lowCores || lowMemory || noBlur;

    return {
      enableGlass: !isLowPower && !prefersReducedTransparency,
      enableMotion: !prefersReducedMotion,
      enableSignal: !prefersReducedTransparency,
      isLowPower,
    };
  }, []);
}
