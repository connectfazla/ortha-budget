/**
 * Undo toast for reversible deletes (docs/MOTION-SPEC.md § 2.5).
 *
 *   hideRow(row.id);                       // optimistic remove first
 *   undoToast("Expense deleted", () => restoreTransaction(row));
 *
 * Shows for 5s with an Undo button. Cmd/Ctrl+Z also undoes while it is up (not while typing in a field).
 */
import { toast } from "sonner";

export function undoToast(message: string, onUndo: () => void) {
  let done = false;
  const undo = () => {
    if (done) return;
    done = true;
    cleanup();
    toast.dismiss(id);
    onUndo();
  };
  const onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t?.closest("input, textarea, [contenteditable='true']")) return;
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
      e.preventDefault();
      undo();
    }
  };
  const cleanup = () => window.removeEventListener("keydown", onKey);
  window.addEventListener("keydown", onKey);

  const id = toast(message, {
    duration: 5000,
    action: { label: "Undo", onClick: undo },
    onDismiss: cleanup,
    onAutoClose: cleanup,
  });
  return id;
}
