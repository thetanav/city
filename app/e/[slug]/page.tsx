import BuyerEventView from "@/components/events/buyer-event-view";

export default async function EventBuyerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="min-h-[calc(100vh-4rem)] px-4 py-10 sm:px-6 lg:px-10">
      <BuyerEventView slug={slug} />
    </main>
  );
}
