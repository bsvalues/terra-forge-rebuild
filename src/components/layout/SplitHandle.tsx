// TerraFusion OS — drag handle between the main and side windows.
// Pointer drag or Arrow keys (5% steps) resize; the ratio is clamped by the caller.
import { useRef } from "react";

interface SplitHandleProps {
  ratio: number;
  onChange: (ratio: number) => void;
  /** Element whose width the ratio is measured against. */
  containerRef: React.RefObject<HTMLElement>;
}

export function SplitHandle({ ratio, onChange, containerRef }: SplitHandleProps) {
  const dragging = useRef(false);

  const fromClientX = (x: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) onChange((x - rect.left) / rect.width);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize windows"
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={25}
      aria-valuemax={75}
      tabIndex={0}
      onPointerDown={(e) => {
        dragging.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => dragging.current && fromClientX(e.clientX)}
      onPointerUp={(e) => {
        dragging.current = false;
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") onChange(ratio - 0.05);
        if (e.key === "ArrowRight") onChange(ratio + 0.05);
      }}
      className="w-2 shrink-0 cursor-col-resize flex items-center justify-center group focus:outline-none"
    >
      <div className="w-1 h-12 rounded-full bg-muted-foreground/30 group-hover:bg-primary/70 group-focus-visible:bg-primary" />
    </div>
  );
}
