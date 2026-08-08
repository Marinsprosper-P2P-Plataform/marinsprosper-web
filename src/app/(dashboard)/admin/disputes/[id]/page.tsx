import { DisputeDetailClient } from "./dispute-detail-client";

export default async function AdminDisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DisputeDetailClient orderId={id} />;
}
