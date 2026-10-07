import { z } from "zod";

import type { Transaction } from "./anomaly";

export const analysisSchema = z.object({
  mode: z.enum(["anomalies", "recurring", "search"]),
  matches: z.array(
    z.object({
      transaction_id: z.string(),
      reason: z.string(),
    }),
  ),
  summary: z.string(),
});

export type AnalysisResult = z.infer<typeof analysisSchema>;
export type RowHighlight = {
  mode: AnalysisResult["mode"];
  reason: string;
  merchant: string;
  color: string;
};

export const recurringColors = [
  "var(--ds-blue-700)",
  "var(--ds-purple-700)",
  "var(--ds-teal-700)",
  "var(--ds-pink-700)",
];

function merchantKey(name: string) {
  return name.trim().toLowerCase();
}

export function findRecurringGroups(
  transactions: Transaction[],
): Transaction[][] {
  const groups = new Map<string, Transaction[]>();
  for (const transaction of transactions) {
    const date = new Date(`${transaction.date}T00:00:00Z`);
    if (
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== transaction.date
    )
      continue;
    const key = `${merchantKey(transaction.name)}:${Math.round(transaction.amount * 100)}`;
    const group = groups.get(key) ?? [];
    group.push(transaction);
    groups.set(key, group);
  }

  return [...groups.values()].flatMap((group) => {
    const dateCounts = new Map<string, number>();
    for (const transaction of group) {
      dateCounts.set(
        transaction.date,
        (dateCounts.get(transaction.date) ?? 0) + 1,
      );
    }
    const series = group
      .filter((t) => dateCounts.get(t.date) === 1)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (series.length < 2) return [];

    const dates = series.map((t) => new Date(`${t.date}T00:00:00Z`));
    const gaps = dates
      .slice(1)
      .map(
        (date, index) => (date.getTime() - dates[index].getTime()) / 86_400_000,
      );
    const fixedDays = gaps[0] > 0 && gaps.every((gap) => gap === gaps[0]);
    const monthly = dates.slice(1).every((date, index) => {
      const previous = dates[index];
      return (
        date.getUTCDate() === previous.getUTCDate() &&
        date.getUTCFullYear() * 12 + date.getUTCMonth() ===
          previous.getUTCFullYear() * 12 + previous.getUTCMonth() + 1
      );
    });
    return fixedDays || monthly ? [series] : [];
  });
}

export function buildHighlights(
  result: AnalysisResult | null,
  transactions: Transaction[],
): Map<string, RowHighlight> {
  const highlights = new Map<string, RowHighlight>();
  if (!result) return highlights;
  const byId = new Map(transactions.map((t) => [t.id, t]));
  const matches = new Map(
    result.matches.map((match) => [match.transaction_id, match.reason]),
  );

  if (result.mode === "recurring") {
    const groups = findRecurringGroups(transactions);
    const merchants = [
      ...new Set(groups.map((group) => merchantKey(group[0].name))),
    ].sort();
    for (const group of groups) {
      const selected = group.find((transaction) => matches.has(transaction.id));
      if (!selected) continue;
      const color =
        recurringColors[
          merchants.indexOf(merchantKey(selected.name)) % recurringColors.length
        ];
      for (const transaction of group) {
        highlights.set(transaction.id, {
          mode: "recurring",
          reason:
            matches.get(transaction.id) ??
            matches.get(selected.id) ??
            "Regularly scheduled payment.",
          merchant: transaction.name,
          color,
        });
      }
    }
    return highlights;
  }

  for (const [id, reason] of matches) {
    const transaction = byId.get(id);
    if (!transaction) continue;
    highlights.set(id, {
      mode: result.mode,
      reason,
      merchant: transaction.name,
      color: "",
    });
  }
  return highlights;
}
