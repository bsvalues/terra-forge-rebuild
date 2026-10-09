// TerraFusion OS — Spaces Dock
// Bottom dock: Desktop (Home), saved Spaces (resumable places), "New Space" to save where you are,
// plus a system status pill and a Focus toggle (full-stage window).
// Keyboard: Ctrl/Cmd + Alt + 1..8 jumps to a space. Double-click a space to rename it.

import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Monitor, Plus, X, Eye, Cloud, CloudOff, Moon, Sun } from "lucide-react";
import {
  addSpace,
  loadSpaces,
  removeSpace,
  renameSpace,
  saveSpaces,
  spaceIndexFromKey,
  MAX_SPACES,
  type Space,
} from "@/lib/spaces";
import { useCountyVitals } from "@/hooks/useCountyVitals";
import { cn } from "@/lib/utils";

interface SpacesDockProps {
  currentTitle: string;
  minimized: boolean;
  focused: boolean;
  onRestore: () => void;
  onToggleFocus: () => void;
}

export function SpacesDock({ currentTitle, minimized, focused, onRestore, onToggleFocus }: SpacesDockProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState<Space[]>(() => loadSpaces());
  const [editingId, setEditingId] = useState<string | null>(null);
  const currentPath = location.pathname + location.search;
  const { data: vitals, isError } = useCountyVitals();
  const online = !isError && vitals != null;

  useEffect(() => saveSpaces(spaces), [spaces]);

  // Keep latest values for the global key handler without re-binding on every render.
  const latest = useRef({ spaces, onRestore, navigate });
  latest.current = { spaces, onRestore, navigate };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const idx = spaceIndexFromKey(e);
      if (idx === null) return;
      const target = latest.current.spaces[idx];
      if (!target) return;
      e.preventDefault();
      latest.current.onRestore();
      latest.current.navigate(target.path);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (path: string) => {
    onRestore();
    navigate(path);
  };

  const alreadySaved = spaces.some((s) => s.path === currentPath);
  const full = spaces.length >= MAX_SPACES;

  return (
    <div className="hidden md:flex items-end justify-between gap-3 mx-3 mb-3 shrink-0">
      <nav aria-label="Spaces" className="desktop-dock flex items-end gap-1.5 px-2 py-1.5 rounded-2xl overflow-x-auto">
        <DockTile label="Desktop" active={location.pathname.startsWith("/home")} onClick={() => go("/home")}>
          <Monitor className="w-4 h-4" />
        </DockTile>

        {minimized && (
          <DockTile label="Show window" active onClick={onRestore}>
            <Eye className="w-4 h-4" />
          </DockTile>
        )}

        {spaces.map((s, i) =>
          editingId === s.id ? (
            <RenameTile
              key={s.id}
              initial={s.name}
              onDone={(name) => {
                if (name !== null) setSpaces((list) => renameSpace(list, s.id, name));
                setEditingId(null);
              }}
            />
          ) : (
            <div key={s.id} className="relative group">
              <DockTile
                label={s.name}
                index={i + 1}
                hint={`${s.name} — Ctrl+Alt+${i + 1}. Double-click to rename.`}
                active={s.path === currentPath}
                onClick={() => go(s.path)}
                onDoubleClick={() => setEditingId(s.id)}
              />
              <button
                aria-label={`Remove space ${s.name}`}
                onClick={() => setSpaces((list) => removeSpace(list, s.id))}
                className="absolute -top-1 -right-1 hidden group-hover:flex group-focus-within:flex w-4 h-4 rounded-full bg-muted items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ),
        )}

        <DockTile
          label={alreadySaved ? "Saved" : full ? "Dock full" : "New Space"}
          hint={alreadySaved ? "This page is already a space" : full ? `Up to ${MAX_SPACES} spaces` : "Save this page as a space"}
          onClick={() => setSpaces((s) => addSpace(s, currentTitle, currentPath, crypto.randomUUID()))}
          disabled={alreadySaved || full}
        >
          <Plus className="w-4 h-4" />
        </DockTile>
      </nav>

      <div className="flex items-center gap-2">
        <div role="status" className="desktop-dock flex items-center gap-2 h-10 px-3 rounded-xl text-[11px] text-foreground/80">
          {online ? <Cloud className="w-3.5 h-3.5 text-tf-green" /> : <CloudOff className="w-3.5 h-3.5 text-tf-red" />}
          {online ? "All systems operational" : vitals === undefined && !isError ? "Connecting…" : "Data offline"}
        </div>
        <button
          onClick={onToggleFocus}
          aria-pressed={focused}
          className={cn("desktop-dock flex items-center gap-2 h-10 px-3 rounded-xl text-[11px] text-foreground/80 hover:text-foreground", focused && "dock-tile-active")}
        >
          {focused ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          {focused ? "Exit focus" : "Focus"}
        </button>
      </div>
    </div>
  );
}

function RenameTile({ initial, onDone }: { initial: string; onDone: (name: string | null) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <input
      autoFocus
      aria-label="Space name"
      value={value}
      maxLength={40}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onDone(value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onDone(value);
        if (e.key === "Escape") onDone(null);
      }}
      className="dock-tile w-24 h-14 rounded-xl px-2 text-[11px] text-foreground bg-transparent outline-none focus:ring-1 focus:ring-primary"
    />
  );
}

function DockTile({
  label,
  index,
  hint,
  active,
  disabled,
  onClick,
  onDoubleClick,
  children,
}: {
  label: string;
  index?: number;
  hint?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  onDoubleClick?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      disabled={disabled}
      title={hint ?? label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "dock-tile flex flex-col items-center justify-center gap-1 w-24 h-14 rounded-xl text-[11px] transition-all",
        active && "dock-tile-active",
        disabled && "opacity-50 cursor-default",
      )}
    >
      {children ?? <span className="text-[10px] font-mono text-muted-foreground">{index}</span>}
      <span className="truncate max-w-[5.5rem] text-foreground/80">{label}</span>
    </button>
  );
}
