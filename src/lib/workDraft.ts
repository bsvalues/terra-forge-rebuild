/**
 * Unsaved-work recovery. Drafts live in this browser only (localStorage), keyed
 * by kind + record id, and are cleared after a successful save or explicit
 * discard. They never write county data; the domain owner's save does that.
 */
const PREFIX = "tf-draft:";
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export interface WorkDraft<T> { savedAt: number; data: T }

const key = (kind: string, id: string) => `${PREFIX}${kind}:${id}`;

export function saveDraft<T>(kind: string, id: string, data: T, now = Date.now()) {
  try { localStorage.setItem(key(kind, id), JSON.stringify({ savedAt: now, data })); } catch { /* storage full or disabled: recovery unavailable */ }
}

export function loadDraft<T>(kind: string, id: string, now = Date.now()): WorkDraft<T> | null {
  try {
    const raw = localStorage.getItem(key(kind, id));
    if (!raw) return null;
    const draft = JSON.parse(raw) as WorkDraft<T>;
    if (typeof draft?.savedAt !== "number" || now - draft.savedAt > MAX_AGE_MS) { clearDraft(kind, id); return null; }
    return draft;
  } catch { return null; }
}

export function clearDraft(kind: string, id: string) {
  try { localStorage.removeItem(key(kind, id)); } catch { /* ignore */ }
}
