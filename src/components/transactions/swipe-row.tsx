"use client";

// Swipe-left reveals Delete on touch/pen pointers [Mobbin: Venmo and Lightyear transaction rows for the row anatomy,
// Slack "Removed from Later" confirmation for the undo feedback. No Mobbin frame shows the swipe itself].
// Plain pointer events. Mouse never drags; keyboard users get the row menu instead.

import { useRef, useState } from "react";
import { Trash2Icon } from "lucide-react";

const REVEAL = 88; // px the row slides to show the action
const COMMIT = 0.6; // fraction of the row width that deletes without a tap

export function SwipeRow({ children, label, onDelete }: { children: React.ReactNode; label: string; onDelete: () => void }) {
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; base: number; id: number } | null>(null);
  const moved = useRef(false);
  const box = useRef<HTMLDivElement>(null);

  function down(e: React.PointerEvent) {
    if (e.pointerType === "mouse") return;
    start.current = { x: e.clientX, y: e.clientY, base: x, id: e.pointerId };
    moved.current = false;
  }
  function move(e: React.PointerEvent) {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (!dragging) {
      if (Math.abs(e.clientY - s.y) > 8 && Math.abs(e.clientY - s.y) > Math.abs(dx)) return void (start.current = null); // vertical scroll
      if (Math.abs(dx) < 8) return;
      setDragging(true);
      e.currentTarget.setPointerCapture(s.id);
    }
    moved.current = true;
    setX(Math.min(0, Math.max(-(box.current?.offsetWidth ?? 400), s.base + dx)));
  }
  function up() {
    if (!start.current) return;
    start.current = null;
    setDragging(false);
    const w = box.current?.offsetWidth ?? 400;
    if (-x > w * COMMIT) {
      navigator.vibrate?.(10);
      onDelete();
    } else setX(-x > REVEAL / 2 ? -REVEAL : 0);
  }

  const open = x <= -REVEAL / 2;
  return (
    <div ref={box} className="relative overflow-hidden">
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        aria-label={`Delete ${label}`}
        onClick={onDelete}
        style={{ width: REVEAL }}
        className="bg-destructive text-background absolute inset-y-0 right-0 flex items-center justify-center gap-1.5 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-inset lg:hidden"
      >
        <Trash2Icon className="size-4" aria-hidden /> Delete
      </button>
      <div
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClickCapture={(e) => {
          // A drag or an open row never opens the editor: the tap just closes the row.
          if (moved.current || x !== 0) {
            e.preventDefault();
            e.stopPropagation();
            moved.current = false;
            if (x !== 0) setX(0);
          }
        }}
        style={{ transform: `translateX(${x}px)`, touchAction: "pan-y" }}
        className={`bg-card relative lg:transform-none! ${dragging ? "" : "transition-transform duration-[var(--dur-base,220ms)] ease-[var(--ease-out,cubic-bezier(.22,1,.36,1))] motion-reduce:transition-none"}`}
      >
        {children}
      </div>
    </div>
  );
}
