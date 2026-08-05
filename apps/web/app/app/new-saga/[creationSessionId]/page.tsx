import { notFound } from "next/navigation";
import { SagaWorkshopReview } from "@/components/SagaWorkshopReview";
import { SagaWorkshopConversation } from "@/components/SagaWorkshopConversation";
import { getSagaWorkshop } from "@/lib/data";

export default async function ResumeSagaCreationPage({
  params
  , searchParams
}: {
  params: Promise<{ creationSessionId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { creationSessionId } = await params;
  const query = await searchParams;
  const workshop = await getSagaWorkshop(creationSessionId);
  if (!workshop) notFound();

  return (
    <main className="auth-shell">
      {workshop.phase === "review" || workshop.phase === "committed" || workshop.state === "committed"
        ? <SagaWorkshopReview workshop={workshop} error={query.error} />
        : <SagaWorkshopConversation workshop={workshop} error={query.error} />}
    </main>
  );
}
