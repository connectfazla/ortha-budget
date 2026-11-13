"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { createAvatarUpload, removeAvatar, saveAvatar, saveDisplayName } from "@/lib/actions";
import { supabaseBrowser } from "@/components/receipts/supabase-browser";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX = 2 * 1024 * 1024;

/** Profile header: photo (or initial), change/remove controls and the name field. */
export function ProfileIdentity({ name, email, photoUrl, hasPhoto }: { name: string; email: string; photoUrl: string | null; hasPhoto: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? name;

  const upload = (f: File | undefined) => {
    if (input.current) input.current.value = "";
    if (!f) return;
    if (!TYPES.includes(f.type)) return void toast.error("Use a JPG, PNG or WebP image");
    if (f.size > MAX) return void toast.error("Photos can be up to 2 MB");
    start(async () => {
      try {
        const up = await createAvatarUpload(f.type, f.size);
        if (!up.ok || !up.path || !up.token) throw new Error(up.ok ? "Upload failed." : up.error);
        const { error } = await supabaseBrowser().storage.from("avatars").uploadToSignedUrl(up.path, up.token, f);
        if (error) throw new Error("Upload failed. Check your connection and try again.");
        const saved = await saveAvatar(up.path);
        if (!saved.ok) throw new Error(saved.error);
        toast.success("Photo updated");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed.");
      }
    });
  };

  const remove = () =>
    start(async () => {
      const r = await removeAvatar();
      if (!r.ok) return void toast.error(r.error);
      toast.success("Photo removed");
      router.refresh();
    });

  const saveName = () =>
    start(async () => {
      const r = await saveDisplayName(value);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Name saved");
      setDraft(null);
      router.refresh();
    });

  const shown = name || email.split("@")[0] || "?";
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Avatar className="size-20 after:border-0">
        {photoUrl ? <AvatarImage src={photoUrl} alt="" /> : null}
        <AvatarFallback className="bg-brand text-on-hero text-3xl font-bold">{shown.slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 max-w-full">
        <p className="truncate text-xl font-bold tracking-tight">{shown}</p>
        <p className="text-muted-foreground truncate text-sm" title={email}>{email}</p>
      </div>
      <input ref={input} type="file" accept={TYPES.join(",")} className="sr-only" tabIndex={-1} aria-label="Photo file" onChange={(e) => upload(e.target.files?.[0])} />
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" className="h-11" disabled={pending} onClick={() => input.current?.click()}>
          {pending ? <Spinner aria-hidden /> : <Camera aria-hidden />}
          Change photo
        </Button>
        {hasPhoto ? (
          <Button variant="ghost" className="text-muted-foreground h-11" disabled={pending} onClick={remove}>
            Remove photo
          </Button>
        ) : null}
      </div>
      <form
        className="w-full max-w-xs text-left"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft !== null && draft !== name) saveName();
        }}
      >
        <Field>
          <FieldLabel htmlFor="display-name">Name</FieldLabel>
          <div className="flex gap-2">
            <Input id="display-name" value={value} maxLength={60} autoComplete="name" placeholder={email.split("@")[0]} onChange={(e) => setDraft(e.target.value)} className="h-11" />
            <Button type="submit" variant="outline" className="h-11" disabled={pending || draft === null || draft === name}>
              Save
            </Button>
          </div>
        </Field>
      </form>
    </div>
  );
}
