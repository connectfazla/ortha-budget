"use client";

/**
 * List that animates insert and remove (docs/MOTION-SPEC.md § 2.7). CSS lives in globals.css (`list-row`).
 *
 *   <AnimatedList items={rows} getKey={(r) => r.id} className="divide-y" itemClassName="px-4">
 *     {(row) => <TransactionRow row={row} />}
 *   </AnimatedList>
 *
 * Rows present on first render appear as-is (no layout shift). A row added later grows in and flashes
 * brand once. A row dropped from `items` collapses out, then unmounts. Pair a delete with undoToast():
 * if the row comes back it grows in again.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

type Ghost<T> = { key: string; item: T; index: number };

export function AnimatedList<T>({
  items,
  getKey,
  children,
  className,
  itemClassName,
}: {
  items: T[];
  getKey: (item: T) => string;
  children: (item: T) => React.ReactNode;
  className?: string;
  itemClassName?: string;
}) {
  const [prev, setPrev] = React.useState(items);
  const [ghosts, setGhosts] = React.useState<Ghost<T>[]>([]);
  const [fresh, setFresh] = React.useState<Set<string>>(() => new Set());

  // Derive removed and added rows when `items` changes (React's "adjust state during render" pattern).
  if (items !== prev) {
    const now = new Set(items.map(getKey));
    const before = new Set(prev.map(getKey));
    const gone = prev.flatMap((item, index) => (now.has(getKey(item)) ? [] : [{ key: getKey(item), item, index }]));
    setGhosts((g) => [...g.filter((x) => !now.has(x.key) && !gone.some((y) => y.key === x.key)), ...gone]);
    setFresh((f) => new Set([...f, ...items.map(getKey).filter((k) => !before.has(k))]));
    setPrev(items);
  }

  const rows: { key: string; item: T; removing: boolean }[] = items.map((item) => ({ key: getKey(item), item, removing: false }));
  for (const g of [...ghosts].sort((a, b) => a.index - b.index)) {
    rows.splice(Math.min(g.index, rows.length), 0, { key: g.key, item: g.item, removing: true });
  }

  return (
    <ul className={className}>
      {rows.map(({ key, item, removing }) => (
        <li
          key={key}
          className={cn("list-row", itemClassName)}
          data-new={fresh.has(key) || undefined}
          data-removing={removing || undefined}
          onTransitionEnd={(e) => {
            if (removing && e.target === e.currentTarget && e.propertyName === "grid-template-rows") {
              setGhosts((g) => g.filter((x) => x.key !== key));
            }
          }}
        >
          <div>{children(item)}</div>
        </li>
      ))}
    </ul>
  );
}
