import BuyerEventView from "@/components/events/buyer-event-view";

export default async function EventBuyerPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = await params;

  return <BuyerEventView slug={slug} />;
}
