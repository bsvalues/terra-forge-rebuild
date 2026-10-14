/**
 * Durable, device-local recovery for an unpublished import. Parsed files can be
 * many megabytes, so drafts live in IndexedDB (not localStorage). A draft never
 * publishes anything; it only lets the wizard reopen where the user left off.
 * Drafts are scoped per county and per user and expire after 7 days.
 */
const DB = "tf-import-drafts";
const STORE = "drafts";
export const IMPORT_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Steps a draft may resume at. In-flight publish is never resumed as running. */
const RESUMABLE = ["upload", "mapping", "validate", "preview"] as const;
export type ResumableStep = (typeof RESUMABLE)[number];

export interface ImportDraft<TFile = unknown, TMap = unknown, TVal = unknown> {
  savedAt: number;
  step: string;
  targetTable: string;
  importProfile: string;
  parsedFile: TFile | null;
  mappings: TMap[];
  validation: TVal | null;
  detectedCombined: boolean;
  jobId: string | null;
}

/** Publish/complete steps resume at preview so nothing re-runs automatically. */
export function resumeStep(step: string): ResumableStep | null {
  if ((RESUMABLE as readonly string[]).includes(step)) return step as ResumableStep;
  if (step === "publish") return "preview";
  return null;
}

export const draftKey = (countyId: string, userId: string) => `${countyId}:${userId}`;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally { db.close(); }
}

export async function saveImportDraft(key: string, draft: ImportDraft): Promise<boolean> {
  try { await run("readwrite", s => s.put(draft, key)); return true; } catch { return false; }
}

export async function loadImportDraft(key: string, now = Date.now()): Promise<ImportDraft | null> {
  try {
    const draft = await run<ImportDraft | undefined>("readonly", s => s.get(key));
    if (!draft || typeof draft.savedAt !== "number") return null;
    if (now - draft.savedAt > IMPORT_DRAFT_MAX_AGE_MS || !resumeStep(draft.step) || !draft.parsedFile) {
      await clearImportDraft(key);
      return null;
    }
    return { ...draft, step: resumeStep(draft.step)! };
  } catch { return null; }
}

export async function clearImportDraft(key: string): Promise<void> {
  try { await run("readwrite", s => s.delete(key)); } catch { /* recovery store unavailable */ }
}
