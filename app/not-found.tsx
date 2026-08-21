import Link from "next/link";

export default function NotFound() {
  return (
    <main className="state-page">
      <p className="kicker">404</p>
      <h1>This path is not on the map.</h1>
      <p>The page may have moved, or the possibility is no longer published.</p>
      <Link className="button button-primary" href="/en/explore">
        Back to Explore
      </Link>
    </main>
  );
}
