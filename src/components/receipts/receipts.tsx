"use client";

// Receipts for one transaction. Layout follows Monarch's "Receipts & attachments" block, a dashed upload target
// under file rows with a size and a remove control: https://mobbin.com/flows/e7945489-2876-44a7-9425-9ce0472d7233
// and Quicken's Attachments field with a pending chip: https://mobbin.com/flows/1e3fd995-b64d-46c3-aa06-298fb363ce0e
// Phone capture follows Expensify's photo flow: https://mobbin.com/flows/49a113d4-5959-4b6e-ae99-a4a0a0e917c3

import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { CameraIcon, FileTextIcon, Trash2Icon } from "lucide-react";
import { createReceiptUpload, deleteReceipt, receiptUrl, saveReceipt } from "@/lib/actions";
import type { Attachment } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { listReceipts } from "./actions";
import { supabaseBrowser } from "./supabase-browser";

const MAX = 10 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
const isPdf = (a: { mime: string }) => a.mime === "application/pdf";
const size = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function check(f: File): string | null {
  // Some browsers report HEIC as "" or image/heif.
  if (!TYPES.includes(f.type)) return "Use a JPG, PNG, WebP, HEIC or PDF file.";
  if (f.size > MAX) return `That file is ${size(f.size)}. The limit is 10 MB.`;
  if (f.size === 0) return "That file is empty.";
  return null;
}

export function Receipts({ transactionId }: { transactionId?: string }) {
  const [items, setItems] = useState<Attachment[] | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<Attachment | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const headingId = useId();

  useEffect(() => {
    if (!transactionId) return;
    let live = true;
    listReceipts(transactionId)
      .then((r) => live && setItems(r))
      .catch(() => live && setError("Couldn’t load receipts."));
    return () => {
      live = false;
    };
  }, [transactionId]);

  if (!transactionId) return <p className="text-muted-foreground mt-6 text-sm">Save first, then add receipts.</p>;
  const txnId = transactionId;

  async function onFile(f: File | undefined) {
    if (input.current) input.current.value = "";
    if (!f) return;
    const bad = check(f);
    setError(bad);
    if (bad) return;
    setUploading(f.name);
    try {
      const up = await createReceiptUpload(f.type, f.size);
      if (!up.ok || !up.path || !up.token) throw new Error(up.ok ? "Upload failed." : up.error);
      const { error: e } = await supabaseBrowser().storage.from("receipts").uploadToSignedUrl(up.path, up.token, f);
      if (e) throw new Error("Upload failed. Check your connection and try again.");
      const saved = await saveReceipt({ transaction_id: txnId, path: up.path, name: f.name, mime: f.type, size: f.size });
      if (!saved.ok) throw new Error(saved.error);
      setItems(await listReceipts(txnId));
      toast.success("Receipt added");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(null);
    }
  }

  async function remove(a: Attachment) {
    const r = await deleteReceipt(a.id);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    setItems((l) => l?.filter((x) => x.id !== a.id) ?? null);
    setView(null);
    toast.success("Receipt deleted");
  }

  return (
    <section aria-labelledby={headingId} className="mt-6">
      <h3 id={headingId} className="label mb-2">
        Receipts
      </h3>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2">
        {items?.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => setView(a)}
              aria-label={`Open receipt ${a.name}`}
              className="bg-muted focus-visible:ring-ring/60 relative grid aspect-square w-full place-items-center overflow-hidden rounded-md border outline-none focus-visible:ring-3 active:scale-[.97] motion-reduce:transition-none"
            >
              {isPdf(a) ? <FileTextIcon className="text-muted-foreground size-6" aria-hidden /> : <Thumb path={a.path} />}
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            disabled={uploading !== null}
            onClick={() => input.current?.click()}
            className="text-muted-foreground hover:bg-muted/50 focus-visible:ring-ring/60 grid aspect-square w-full place-items-center content-center gap-1 rounded-md border border-dashed text-xs outline-none focus-visible:ring-3 disabled:opacity-60"
          >
            {uploading ? <Spinner className="size-5 motion-reduce:animate-none" aria-hidden /> : <CameraIcon className="size-5" aria-hidden />}
            {uploading ? "Uploading" : "Add"}
          </button>
        </li>
      </ul>
      {items?.length === 0 && !uploading ? (
        <p className="text-muted-foreground mt-2 text-xs">Photos and PDFs up to 10 MB.</p>
      ) : null}
      {uploading ? (
        <p role="status" className="text-muted-foreground mt-2 truncate text-xs">
          Uploading {uploading}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-money-out mt-2 text-xs">
          {error}
        </p>
      ) : null}
      <input
        ref={input}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose a receipt photo or PDF"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <Viewer item={view} onClose={() => setView(null)} onDelete={remove} />
    </section>
  );
}

/** Signed links last 60 s, so each use asks for a fresh one. */
function useSigned(path: string | undefined) {
  // Results are tagged with their path so a stale answer is never shown for a newer one.
  const [res, setRes] = useState<{ path: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!path) return;
    let live = true;
    receiptUrl(path)
      .then((r) => live && setRes({ path, url: r.ok && r.url ? r.url : null }))
      .catch(() => live && setRes({ path, url: null }));
    return () => {
      live = false;
    };
  }, [path]);
  const mine = res?.path === path ? res : null;
  return { url: mine?.url ?? null, failed: mine !== null && mine.url === null };
}

function Thumb({ path }: { path: string }) {
  const { url, failed } = useSigned(path);
  const [broken, setBroken] = useState(false);
  if (failed || broken) return <FileTextIcon className="text-muted-foreground size-6" aria-hidden />;
  if (!url) return <span className="bg-muted size-full animate-pulse motion-reduce:animate-none" aria-hidden />;
  // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL, not optimisable
  return <img src={url} alt="" onError={() => setBroken(true)} className="size-full object-cover" />;
}

function Viewer({ item, onClose, onDelete }: { item: Attachment | null; onClose: () => void; onDelete: (a: Attachment) => void }) {
  const [confirm, setConfirm] = useState(false);
  const { url, failed } = useSigned(item?.path);
  const [brokenId, setBrokenId] = useState<string | null>(null);
  const broken = brokenId === item?.id;
  return (
    <>
      <Dialog open={item !== null} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
            <DialogDescription className="truncate">{item ? `${item.name}, ${size(item.size)}` : ""}</DialogDescription>
          </DialogHeader>
          <div className="bg-muted grid min-h-48 place-items-center overflow-hidden rounded-md border">
            {failed ? (
              <p className="text-muted-foreground p-4 text-sm">Couldn’t load this file.</p>
            ) : !url ? (
              <Spinner className="text-muted-foreground size-5 motion-reduce:animate-none" />
            ) : item && !isPdf(item) && !broken ? (
              // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
              <img src={url} alt={`Receipt ${item.name}`} onError={() => setBrokenId(item.id)} className="max-h-[60dvh] w-full object-contain" />
            ) : (
              <div className="grid justify-items-center gap-3 p-6">
                <FileTextIcon className="text-muted-foreground size-10" aria-hidden />
                <Button nativeButton={false} variant="outline" className="h-11" render={<a href={url} target="_blank" rel="noopener noreferrer" />}>
                  {item && isPdf(item) ? "Open PDF" : "Open file"}
                </Button>
              </div>
            )}
          </div>
          <Button type="button" variant="ghost" className="text-money-out h-11" onClick={() => setConfirm(true)}>
            <Trash2Icon /> Delete receipt
          </Button>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this receipt?</AlertDialogTitle>
            <AlertDialogDescription>The file is removed for good. This can’t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirm(false);
                if (item) onDelete(item);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
