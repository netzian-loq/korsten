import type { Metadata } from "next";

import { DealWorkspace } from "./_components/deal-workspace";

export const metadata: Metadata = {
  title: "Deal",
  description: "One transaction: dates, offers, inspection, and documents.",
};

export default async function DealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DealWorkspace dealId={id} />;
}
