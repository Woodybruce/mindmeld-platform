import { apiInvoke } from "@/lib/api";
import type { ButlerAction, ProposalPayload } from "@shared/validation/proposals";

export type { ButlerAction, ProposalPayload };

export type ProposalStatus = "pending" | "accepted" | "dismissed" | "error";

export interface ButlerProposal {
  id: string;
  householdId: string;
  source: string;
  sender: string | null;
  subject: string | null;
  receivedAt: string;
  payload: ProposalPayload;
  status: ProposalStatus;
}

export async function fetchPendingProposals(): Promise<ButlerProposal[]> {
  const { data, error } = await apiInvoke<ButlerProposal[]>("butler/proposals", {
    query: { status: "pending" },
  });
  if (error) throw error;
  return data ?? [];
}

export async function acceptProposal(id: string): Promise<ButlerProposal | null> {
  const { data, error } = await apiInvoke<ButlerProposal>(`butler/proposals/${id}/accept`, { method: "POST" });
  if (error) throw error;
  return data;
}

export async function dismissProposal(id: string): Promise<ButlerProposal | null> {
  const { data, error } = await apiInvoke<ButlerProposal>(`butler/proposals/${id}/dismiss`, { method: "POST" });
  if (error) throw error;
  return data;
}
