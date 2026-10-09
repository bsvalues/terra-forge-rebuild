// TerraFusion OS — Side window
// A second window beside the main one. It loads the same app in embed mode, so it keeps its own
// page and history. Its title follows whatever page is open inside it.

import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, X } from "lucide-react";
import { buildEmbedUrl, stripEmbedParam } from "@/lib/splitView";
import { windowTitleForPath } from "@/lib/desktopWindow";

interface SideWindowProps {
  path: string;
  onClose: () => void;
  /** Called with the side window's current page so it can become the main window. */
  onSwap: (currentPath: string) => void;
}

export function SideWindow({ path, onClose, onSwap }: SideWindowProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [title, setTitle] = useState("Loading…");
  const src = buildEmbedUrl(path);

  // Read the embedded page's location (same origin) to label the window and support swapping.
  const currentPath = () => {
    try {
      const loc = frameRef.current?.contentWindow?.location;
      if (loc) return stripEmbedParam(loc.pathname + loc.search + loc.hash);
    } catch {
      /* cross-origin should never happen here; fall back to the opening path */
    }
    return path;
  };

  // Poll the embedded page's location (same origin) so the title follows in-window navigation.
  useEffect(() => {
    const update = () => {
      const t = windowTitleForPath(currentPath());
      setTitle(t.subtitle ? `${t.title} · ${t.subtitle}` : t.title);
    };
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  if (!src) return null;

  return (
    <section aria-label="Side window" className="desktop-window flex flex-col min-h-0 flex-1 overflow-hidden rounded-xl">
      <header className="desktop-window-titlebar h-9 flex items-center gap-3 px-3 shrink-0">
        <div className="group flex items-center gap-1.5">
          <button aria-label="Close side window" onClick={onClose} className="traffic-light traffic-close">
            <X className="w-2 h-2" />
          </button>
          <span className="traffic-light bg-muted" aria-hidden />
          <span className="traffic-light bg-muted" aria-hidden />
        </div>
        <h2 className="text-[13px] font-semibold text-foreground/90 truncate flex-1">{title}</h2>
        <button
          onClick={() => onSwap(currentPath())}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          title="Make this the main window"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" /> Swap
        </button>
      </header>
      <iframe ref={frameRef} src={src} title="Side window content" className="flex-1 w-full border-0 bg-background" />
    </section>
  );
}
