export default function Loading() {
  return (
    <main className="state-page" aria-live="polite" aria-busy="true">
      <div className="route-loader" aria-hidden="true">
        <span />
      </div>
      <p>Loading Veya</p>
    </main>
  );
}
