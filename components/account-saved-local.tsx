"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { syncSavedAction } from "@/app/actions";
import { discoverableBySlug } from "@/lib/content/seed";
import { pickText, type Locale } from "@/lib/i18n";
import { readSaved, SAVED_EVENT, writeSaved, type SavedReference } from "@/lib/saved";

export function AccountSavedLocal({
  locale,
  canSync,
}: {
  locale: Locale;
  canSync: boolean;
}) {
  const [items, setItems] = useState<SavedReference[]>([]);
  const [status, setStatus] = useState("");
  const [isPending, startTransition] = useTransition();
  const autoSyncStarted = useRef(false);

  useEffect(() => {
    const update = () => setItems(readSaved());
    update();
    window.addEventListener(SAVED_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(SAVED_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  useEffect(() => {
    if (!canSync || items.length === 0 || autoSyncStarted.current) return;
    autoSyncStarted.current = true;
    startTransition(async () => {
      const result = await syncSavedAction(items);
      setStatus(result.message);
    });
  }, [canSync, items]);

  function remove(reference: SavedReference) {
    const next = readSaved().filter(
      (item) => item.slug !== reference.slug || item.kind !== reference.kind,
    );
    writeSaved(next);
    setItems(next);
  }

  function sync() {
    if (!canSync || items.length === 0 || isPending) return;
    setStatus("");
    startTransition(async () => {
      const result = await syncSavedAction(items);
      setStatus(result.message);
    });
  }

  return (
    <section className="account-local-saves" aria-labelledby="local-saves-title">
      <div className="account-section-heading">
        <h2 id="local-saves-title">Saved in this browser</h2>
        <p>
          Guest saves stay on this device. After sign-in, supported published items are also
          copied to your Veya account.
        </p>
      </div>
      {items.length === 0 ? (
        <p className="account-empty-state">Nothing is saved in this browser yet.</p>
      ) : (
        <ul className="account-local-saves__list">
          {items.map((reference) => {
            const item = discoverableBySlug.get(reference.slug);
            const title =
              item && item.kind === reference.kind
                ? pickText(item.title, locale)
                : reference.slug;
            return (
              <li key={`${reference.kind}:${reference.slug}`} className="account-local-saves__item">
                <div>
                  <strong>{title}</strong>
                  <span>{reference.kind}</span>
                </div>
                <div className="account-local-saves__actions">
                  <Link
                    className="text-link"
                    href={`/${locale}/discover/${reference.kind}/${reference.slug}`}
                  >
                    View
                  </Link>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => remove(reference)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {canSync ? (
        <div className="account-local-saves__sync">
          <button
            className="button button-primary"
            type="button"
            onClick={sync}
            disabled={isPending || items.length === 0}
          >
            {isPending ? "Syncing saved items" : "Sync again"}
          </button>
          <p className="form-status" role="status" aria-live="polite">
            {status}
          </p>
        </div>
      ) : null}
    </section>
  );
}
