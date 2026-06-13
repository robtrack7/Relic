import Link from "next/link";
import { RelicIcon } from "@/components/RelicIcon";

export default async function ResumeSagaCreationPage({
  params
}: {
  params: Promise<{ creationSessionId: string }>;
}) {
  const { creationSessionId } = await params;

  return (
    <main className="auth-shell">
      <section className="auth-card" style={{ maxWidth: 720 }}>
        <div className="page-eyebrow"><RelicIcon name="spark" size={12} /> Saga scaffold</div>
        <h1 className="auth-title">Resume saga creation</h1>
        <p className="auth-subtitle">
          Creation session <span style={{ fontFamily: "var(--font-mono)" }}>{creationSessionId}</span> is recognized, but AI scaffold review is not enabled in this web pass. Start blank remains available and preserves the canon rule.
        </p>
        <div className="danger-zone" style={{ margin: "18px 0" }}>
          <div className="dz-title">Canon gate preserved</div>
          <p style={{ fontSize: 12, color: "var(--stone-700)", margin: 0, lineHeight: 1.5 }}>
            AI-assisted starting material must be reviewed and committed by the GM before becoming canon. This route will host that review flow when the AI runtime entrypoint is wired.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn btn-ink" href="/app/new-saga">
            Create a blank Saga
          </Link>
          <Link className="btn btn-ghost" href="/app">
            Return to app
          </Link>
        </div>
      </section>
    </main>
  );
}
