"use client";

import { AlertTriangle, ChevronDown } from "lucide-react";
import { useState } from "react";

import type { AnomalyResult } from "@/lib/anomaly";
import { transactions } from "@/lib/data";
import { cn } from "@/lib/utils";

import { DetectButton } from "./detect-button";

export function TransactionList() {
  const [result, setResult] = useState<AnomalyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const anomalyMap = new Map(
    result?.anomalies.map((a) => [a.transaction_id, a.reason]) ?? [],
  );

  async function detectAnomalies(useSandbox: boolean) {
    setLoading(true);
    setError(null);
    setResult(null);
    setExpandedId(null);

    const endpoint = useSandbox ? "/api/anomaly/sandbox" : "/api/anomaly";
    console.log(`[ui] detecting anomalies (sandbox: ${useSandbox})`);

    try {
      const response = await fetch(endpoint, { method: "POST" });
      if (!response.ok) {
        throw new Error("Detection failed");
      }
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Transactions</h2>
        <DetectButton onDetect={detectAnomalies} loading={loading} />
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-500 text-sm">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-card/50 backdrop-blur-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border border-b bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Date
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Name
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Description
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Amount
              </th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn) => {
              const isAnomaly = anomalyMap.has(txn.id);
              const reason = anomalyMap.get(txn.id);
              const isExpanded = expandedId === txn.id;

              return (
                <TransactionRow
                  key={txn.id}
                  transaction={txn}
                  isAnomaly={isAnomaly}
                  reason={reason}
                  isExpanded={isExpanded}
                  onToggle={() => setExpandedId(isExpanded ? null : txn.id)}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {result?.summary && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <h3 className="mb-2 font-medium">Analysis Summary</h3>
          <p className="text-muted-foreground text-sm">{result.summary}</p>
        </div>
      )}
    </div>
  );
}

type TransactionRowProps = {
  transaction: (typeof transactions)[number];
  isAnomaly: boolean;
  reason?: string;
  isExpanded: boolean;
  onToggle: () => void;
};

function TransactionRow({
  transaction,
  isAnomaly,
  reason,
  isExpanded,
  onToggle,
}: TransactionRowProps) {
  const { date, name, description, amount } = transaction;

  return (
    <>
      <tr
        className={cn(
          "border-border border-b transition-colors",
          isAnomaly && "border-red-500/20 bg-red-500/10",
          isAnomaly && "cursor-pointer hover:bg-red-500/15",
        )}
        onClick={isAnomaly ? onToggle : undefined}
      >
        <td className="px-4 py-3 font-mono text-muted-foreground">{date}</td>
        <td className="px-4 py-3">
          <span className="flex items-center gap-2">
            {name}
            {isAnomaly && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 font-medium text-red-500 text-xs">
                <AlertTriangle className="h-3 w-3" />
                Anomaly
              </span>
            )}
          </span>
        </td>
        <td className="px-4 py-3 text-muted-foreground">{description}</td>
        <td className="px-4 py-3 text-right font-mono">
          ${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </td>
        <td className="px-4 py-3">
          {isAnomaly && (
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isExpanded && "rotate-180",
              )}
            />
          )}
        </td>
      </tr>
      {isAnomaly && isExpanded && (
        <tr className="border-red-500/20 border-b bg-red-500/5">
          <td colSpan={5} className="px-4 py-3">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <div>
                <span className="font-medium text-red-500">Reason: </span>
                <span className="text-muted-foreground">{reason}</span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
