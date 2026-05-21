import Link from "next/link";

export default function HomePage() {
  return (
    <main className="public-page">
      <section className="auth-card">
        <div className="eyebrow">Relic MVP</div>
        <h1 className="display-title">The Sanctum</h1>
        <p className="muted">
          Create, organize, prep, run, review, approve, and continue your Saga.
          Web owns The Sanctum; The Stage remains the live-session surface.
        </p>
        <div className="button-row" style={{ marginTop: 20 }}>
          <Link className="button" href="/app">Open app</Link>
          <Link className="button-ghost" href="/auth/sign-in">Sign in</Link>
        </div>
      </section>
    </main>
  );
}
