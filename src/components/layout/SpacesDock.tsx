// TerraFusion OS — Spaces Dock
// Bottom dock: Desktop (Home), saved Spaces (resumable places), and "New Space" to save where you are.

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Monitor, Plus, X, Eye } from "lucide-react";
import { addSpace, loadSpaces, removeSpace, saveSpaces, MAX_SPACES, type Space } from "@/lib/spaces";
import { cn } from "@/lib/utils";

interface SpacesDockProps {
  currentTitle: string;
  minimized: boolean;
  onRestore: () => void;
}

export function SpacesDock({ currentTitle, minimized, onRestore }: SpacesDockProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState<Space[]>(() => loadSpaces());
  const currentPath = location.pathname + location.search;

  useEffect(() => saveSpaces(spaces), [spaces]);

  const go = (path: string) => {
    onRestore();
    navigate(path);
  };

  const saveCurrent = () => {
    setSpaces((s) => addSpace(s, currentTitle, currentPath, crypto.randomUUID()));
  };

  const alreadySaved = spaces.some((s) => s.path === currentPath);
  const full = spaces.length >= MAX_SPACES;

  return (
    <nav aria-label="Spaces" className="desktop-dock hidden md:flex items-end gap-1.5 px-2 py-1.5 mx-3 mb-3 rounded-2xl shrink-0 overflow-x-auto">
      <DockTile label="Desktop" active={location.pathname.startsWith("/home")} onClick={() => go("/home")}>
        <Monitor className="w-4 h-4" />
      </DockTile>

      {minimized && (
        <DockTile label="Show window" active onClick={onRestore}>
          <Eye className="w-4 h-4" />
        </DockTile>
      )}

      {spaces.map((s, i) => (
        <div key={s.id} className="relative group">
          <DockTile label={s.name} index={i + 1} active={s.path === currentPath} onClick={() => go(s.path)} />
          <button
            aria-label={`Remove space ${s.name}`}
            onClick={() => setSpaces((list) => removeSpace(list, s.id))}
            className="absolute -top-1 -right-1 hidden group-hover:flex w-4 h-4 rounded-full bg-muted items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      ))}

      <DockTile
        label={alreadySaved ? "Saved" : full ? "Dock full" : "New Space"}
        onClick={saveCurrent}
        disabled={alreadySaved || full}
      >
        <Plus className="w-4 h-4" />
      </DockTile>
    </nav>
  );
}

function DockTile({
  label,
  index,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  index?: number;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
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
