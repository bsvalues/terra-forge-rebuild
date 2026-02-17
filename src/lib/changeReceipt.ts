// TerraFusion OS — Change Receipt Toast Helper
// Renders a ChangeReceipt inside a Sonner toast after every governed mutation.
// "Nothing happens silently."

import { toast } from "sonner";
import type { ChangeReceiptData } from "@/components/trust/ChangeReceipt";

/**
 * Show a change receipt toast after a successful mutation.
 * Call this in onSuccess callbacks of mutation hooks.
 */
export function showChangeReceipt(receipt: Omit<ChangeReceiptData, "timestamp">) {
  const full: ChangeReceiptData = {
    ...receipt,
    timestamp: new Date().toISOString(),
  };

  const timeStr = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Build description from changes
  const desc = full.changes && full.changes.length > 0
    ? full.changes.map(c => `${c.field}: ${c.before} → ${c.after}`).join(" • ")
    : full.reason || full.entity;

  toast.success(full.action, {
    description: `${desc} — ${timeStr}`,
    duration: 5000,
  });
}
