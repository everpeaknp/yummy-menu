import type { CustomerOfferGoal } from "@/services/api";

export function rankRewardGoals(goals: CustomerOfferGoal[]): CustomerOfferGoal[] {
  const remainingShare = ({ completed, required }: CustomerOfferGoal) =>
    required > 0 ? (required - completed % required) / required : Number.POSITIVE_INFINITY;
  return [...goals].sort((a, b) =>
    Number(b.available_claims > 0) - Number(a.available_claims > 0)
    || remainingShare(a) - remainingShare(b),
  );
}
