"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = { type: "idle" | "pending" | "success" | "error"; message: string };

export function AuthPanel({
  nextPath,
  configured,
  initialError = false,
}: {
  nextPath: string;
  configured: boolean;
  initialError?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>(
    initialError
      ? { type: "error", message: "The sign-in link could not be completed. Request a new one." }
      : { type: "idle", message: "" },
  );

  function callbackUrl() {
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", nextPath);
    return callback.toString();
  }

  async function sendMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || status.type === "pending") return;

    setStatus({ type: "pending", message: "Sending your secure link" });
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl() },
    });

    setStatus(
      error
        ? { type: "error", message: "We could not start sign-in. Check the address and try again." }
        : { type: "success", message: "Check your email and open the Veya sign-in link." },
    );
  }

  return (
    <section className="auth-panel" aria-labelledby="auth-title">
      <div>
        <p className="kicker">Veya account</p>
        <h1 id="auth-title">Keep your Veya world with you</h1>
        <p>Sign in when you want to sync saves, maintain a profile or express interest.</p>
      </div>

      {!configured ? (
        <div className="inline-notice" role="status">
          Account sync is not connected in this environment. Public discovery and local saves still work.
        </div>
      ) : (
        <form className="auth-form" onSubmit={sendMagicLink}>
          <label htmlFor="auth-email">Email address</label>
          <input
            id="auth-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-describedby="auth-email-help"
            required
          />
          <p id="auth-email-help" className="field-help">
            We will send a secure sign-in link. No password is required.
          </p>
          <button
            className="button button-primary"
            type="submit"
            disabled={status.type === "pending"}
          >
            Email me a sign-in link
          </button>
          <p className={`form-status is-${status.type}`} role="status" aria-live="polite">
            {status.message}
          </p>
        </form>
      )}
    </section>
  );
}
