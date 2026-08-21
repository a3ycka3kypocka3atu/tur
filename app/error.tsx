"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="state-page">
      <p className="kicker">Veya</p>
      <h1>We lost this path for a moment.</h1>
      <p>Your information is safe. Try loading the page again.</p>
      <button className="button button-primary" type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
