"use client";

import { useEffect, useState, useTransition } from "react";
import { toggleSavedAction } from "@/app/actions";
import { readSaved, SAVED_EVENT, writeSaved } from "@/lib/saved";
import type { MvpDiscoverableKind } from "@/lib/types";

export function SaveButton({ slug, kind }: { slug: string; kind: MvpDiscoverableKind }) {
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const update = () => {
      setSaved(readSaved().some((item) => item.slug === slug && item.kind === kind));
    };
    update();
    window.addEventListener(SAVED_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(SAVED_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, [kind, slug]);

  function toggle() {
    if (isPending) return;
    const items = readSaved();
    const nextSaved = !saved;
    const next = nextSaved
      ? [...items.filter((item) => item.slug !== slug || item.kind !== kind), { slug, kind }]
      : items.filter((item) => item.slug !== slug || item.kind !== kind);
    writeSaved(next);
    setSaved(nextSaved);
    setStatus(nextSaved ? "Saved in this browser." : "Removed from this browser.");

    startTransition(async () => {
      const result = await toggleSavedAction({ slug, kind }, nextSaved);
      if (!result.ok && result.mode === "remote" && !nextSaved) {
        const restored = [...readSaved(), { slug, kind }];
        writeSaved(restored);
        setSaved(true);
      }
      setStatus(result.message);
    });
  }

  return (
    <span className="save-control">
      <button
        className={`save-button${saved ? " is-saved" : ""}`}
        type="button"
        aria-pressed={saved}
        disabled={isPending}
        onClick={toggle}
      >
        {saved ? "Remove saved" : "Save"}
      </button>
      <span className="visually-hidden" role="status" aria-live="polite">
        {status}
      </span>
    </span>
  );
}
