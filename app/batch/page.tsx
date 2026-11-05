import type { Metadata } from "next";
import BatchView from "@/components/BatchView";

export const metadata: Metadata = { title: "Batch · Misread Score" };

export default function BatchPage() {
  return <BatchView />;
}
