"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { submitInterestAction } from "@/app/actions";
import type { MvpDiscoverableKind } from "@/lib/types";

type SubmissionState = {
  ok: boolean;
  message: string;
  id?: string;
};

export function InterestForm({
  kind,
  slug,
  title,
}: {
  kind: MvpDiscoverableKind;
  slug: string;
  title: string;
}) {
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<SubmissionState>({ ok: false, message: "" });
  const [pending, startTransition] = useTransition();
  const submissionKey = useRef<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    submissionKey.current ||= window.crypto.randomUUID();
    setState({ ok: false, message: "" });

    startTransition(async () => {
      const result = await submitInterestAction({
        kind,
        slug,
        message,
        consent,
        submissionKey: submissionKey.current as string,
        website,
      });
      setState(result);
      if (result.ok) {
        setMessage("");
        setConsent(false);
        setWebsite("");
        submissionKey.current = null;
      }
    });
  }

  return (
    <form className="interest-form" onSubmit={submit}>
      <label>
        What interests you about {title}?
        <textarea
          name="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          minLength={10}
          maxLength={4000}
          rows={6}
          required
          disabled={pending}
          placeholder="Share what you would like to experience, your rough timing, and any practical questions."
        />
      </label>
      <label className="website-field" aria-hidden="true">
        Website
        <input
          name="website"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          autoComplete="off"
          tabIndex={-1}
        />
      </label>
      <label className="consent-field">
        <input
          name="consent"
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          required
          disabled={pending}
        />
        <span>Veya may use my account details and this message to respond to this request.</span>
      </label>
      <div className="interest-form__actions">
        <button className="button button-primary" type="submit" disabled={pending}>
          {pending ? "Saving your interest" : "Express interest"}
        </button>
        {state.ok ? (
          <Link className="text-link" href="/en/interests">
            View interest history
          </Link>
        ) : null}
      </div>
      <p
        className={`form-status ${state.ok ? "is-success" : state.message ? "is-error" : ""}`}
        role="status"
        aria-live="polite"
      >
        {state.message}
      </p>
    </form>
  );
}
