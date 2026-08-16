import { AdminKycCaseDetailClient } from "./kyc-case-detail-client";

export default async function AdminKycCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminKycCaseDetailClient caseId={id} />;
}
