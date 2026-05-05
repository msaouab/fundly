import type { SimType } from "@/generated/prisma/enums";

import { formatMoney } from "@/lib/money";

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * One-line preview for saved snapshots.
 * Matches `summarizeSavings` / simulator `useEffect` result payloads (see simulations-view and each simulator).
 */
export function formatSimulationResultPreview(
  simType: SimType | string,
  resultJson: unknown,
  currency: string,
): string | null {
  if (!resultJson || typeof resultJson !== "object") return null;
  const r = resultJson as Record<string, unknown>;

  switch (simType) {
    case "SAVINGS_GOAL": {
      const tgt = num(r.targetAmount);
      const m = num(r.monthsToGoal);
      const req = num(r.requiredMonthly);
      const dl = num(r.deadlineMonths);
      if (req != null && dl != null) {
        return `${Math.round(dl)} mo horizon · req ${formatMoney(req, currency)}/mo${tgt != null ? ` · ${formatMoney(tgt, currency)} target` : ""}`;
      }
      if (m != null && tgt != null) return `${Math.round(m)} mo · ${formatMoney(tgt, currency)} target`;
      if (m != null) return `${Math.round(m)} mo to goal`;
      return null;
    }
    case "LOAN": {
      const pay = num(r.monthlyPayment);
      const mt = num(r.monthsToPayOff);
      if (pay != null && mt != null)
        return `${formatMoney(pay, currency)} / mo · ${Math.round(mt)} mo`;
      return null;
    }
    case "DEBT_PAYOFF": {
      const moAv = num(r.avalancheMonths);
      const diff = num(r.interestDifference);
      if (moAv != null && diff != null)
        return `~${Math.round(moAv)} mo (avalanche track) · snowball Δ int. ${formatMoney(Math.max(0, diff), currency)}`;
      if (moAv != null) return `~${Math.round(moAv)} mo to debt-free`;
      return null;
    }
    case "WHAT_IF": {
      const d = num(r.bestScenarioDelta);
      const name = typeof r.bestScenarioName === "string" ? r.bestScenarioName : "Best scenario";
      if (d != null) return `${name}: ${d >= 0 ? "+" : ""}${formatMoney(d, currency)} vs baseline`;
      return "Scenario comparison saved";
    }
    case "NET_WORTH": {
      const end = num(r.endNominal);
      const sc = num(r.healthScore);
      if (end != null) return `${formatMoney(end, currency)} end path${sc != null ? ` · pulse ${Math.round(sc)}` : ""}`;
      return null;
    }
    default:
      return null;
  }
}

