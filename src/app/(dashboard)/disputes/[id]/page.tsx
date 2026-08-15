import { DisputeDetailClient } from "./dispute-detail-client";

export default async function DisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DisputeDetailClient disputeId={id} />;
}
