"use client";

import { useAshAgent } from "experimental-ash/react";
import {
  AlertTriangle,
  BookOpen,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  CircleX,
  FileSearch,
  Loader2,
  Table2,
  Terminal,
  Wrench,
} from "lucide-react";
import type { ComponentType } from "react";
import { useMemo, useState } from "react";
import { Streamdown } from "streamdown";

import { type AnomalyResult, anomalySchema } from "@/lib/anomaly";
import { transactions } from "@/lib/data";
import { cn } from "@/lib/utils";

import { DetectButton } from "./detect-button";

type ToolLogItem = {
  kind: "tool";
  id: string;
  toolName: string;
  actionKind: "load-skill" | "subagent-call" | "tool-call" | "unknown";
  name?: string;
  input: unknown;
  output: unknown;
  errorText?: string;
  state: string;
};

type TextLogItem = { kind: "text"; id: string; text: string };

type LogItem = ToolLogItem | TextLogItem;

type IconType = ComponentType<{ className?: string }>;

export function TransactionList() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [openTools, setOpenTools] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<AnomalyResult | null>(null);

  const agent = useAshAgent({
    onEvent(event) {
      if (event.type === "result.completed") {
        setResult(event.data.result as AnomalyResult);
      }
    },
  });

  const { status, error, data } = agent;
  const isLoading = status === "submitted" || status === "streaming";
  const isStreaming = status === "streaming";

  const anomalyMap = new Map(
    result?.anomalies.map((a) => [a.transaction_id, a.reason]) ?? [],
  );

  // build an ordered log of assistant text and tool/action calls
  const logItems = useMemo<LogItem[]>(() => {
    const items: LogItem[] = [];
    let textCount = 0;
    for (const message of data.messages) {
      if (message.role !== "assistant") continue;
      for (const part of message.parts) {
        if (part.type === "text" && part.text.trim()) {
          items.push({
            kind: "text",
            id: `text-${textCount++}`,
            text: part.text,
          });
        } else if (part.type === "dynamic-tool") {
          items.push({
            kind: "tool",
            id: part.toolCallId,
            toolName: part.toolName,
            actionKind: part.toolMetadata?.ash?.kind ?? "tool-call",
            name: part.toolMetadata?.ash?.name,
            input: part.input,
            output: part.state === "output-available" ? part.output : undefined,
            errorText:
              part.state === "output-error" ? part.errorText : undefined,
            state: part.state,
          });
        }
      }
    }
    return items;
  }, [data.messages]);

  function toggleTool(id: string) {
    setOpenTools((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function detectAnomalies() {
    setExpandedId(null);
    setResult(null);
    setOpenTools(new Set());
    setShowLog(true);
    agent.reset();
    agent.sendMessage("Analyze the transactions for anomalies.", {
      outputSchema: anomalySchema,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Transactions</h2>
        <DetectButton onDetect={detectAnomalies} loading={isLoading} />
      </div>

      {status === "error" && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-500 text-sm">
          {error?.message ?? "Detection failed"}
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

      {/* analysis summary with the log nested inside the same card */}
      {(result?.summary || logItems.length > 0) && (
        <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
          {result?.summary && (
            <div className="p-4">
              <h3 className="mb-2 font-medium">Analysis Summary</h3>
              <p className="text-muted-foreground text-sm">{result.summary}</p>
            </div>
          )}

          {logItems.length > 0 && (
            <div className={cn(result?.summary && "border-border border-t")}>
              <button
                type="button"
                onClick={() => setShowLog((s) => !s)}
                className="flex w-full items-center gap-2 px-4 py-3 text-left font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
              >
                <Terminal className="h-4 w-4" />
                Log
                {isStreaming && (
                  <span className="ml-1 inline-block h-2 w-2 animate-pulse rounded-full bg-green-500" />
                )}
                <ChevronDown
                  className={cn(
                    "ml-auto h-4 w-4 transition-transform",
                    showLog && "rotate-180",
                  )}
                />
              </button>
              {showLog && (
                <div className="scrollbar-themed max-h-[32rem] min-h-64 space-y-2 overflow-y-auto border-border border-t p-3">
                  {logItems.map((item) =>
                    item.kind === "text" ? (
                      <div key={item.id} className="px-1">
                        <Markdown>{item.text}</Markdown>
                      </div>
                    ) : (
                      <ToolCard
                        key={item.id}
                        item={item}
                        isOpen={openTools.has(item.id)}
                        isStreaming={isStreaming}
                        onToggle={() => toggleTool(item.id)}
                      />
                    ),
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function isLoadSkill(item: ToolLogItem): boolean {
  return (
    item.actionKind === "load-skill" ||
    item.toolName === "load_skill" ||
    item.toolName === "ash:load-skill"
  );
}

function toolPresentation(item: ToolLogItem): {
  label: string;
  Icon: IconType;
} {
  if (isLoadSkill(item)) {
    return { label: "Load skill", Icon: BookOpen };
  }
  if (item.actionKind === "subagent-call") {
    return { label: item.name ?? "Subagent", Icon: Bot };
  }
  switch (item.toolName) {
    case "get-transactions":
      return { label: "Get transactions", Icon: Table2 };
    case "get-transaction":
      return { label: "Get transaction", Icon: FileSearch };
    default:
      return { label: prettify(item.toolName), Icon: Wrench };
  }
}

function StateIcon({
  state,
  isStreaming,
}: {
  state: string;
  isStreaming: boolean;
}) {
  if (state === "output-available") {
    return <Check className="h-3.5 w-3.5 text-green-500" />;
  }
  if (state === "output-error") {
    return <CircleX className="h-3.5 w-3.5 text-red-500" />;
  }
  if (state === "output-denied") {
    return <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />;
  }
  if (isStreaming) {
    return (
      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
    );
  }
  return null;
}

function ToolCard({
  item,
  isOpen,
  isStreaming,
  onToggle,
}: {
  item: ToolLogItem;
  isOpen: boolean;
  isStreaming: boolean;
  onToggle: () => void;
}) {
  const { label, Icon } = toolPresentation(item);
  const summary = inputSummary(item.input);
  const output = item.errorText ?? formatValue(item.output);
  const input = formatValue(item.input);
  // load-skill and get-transaction skip the input section entirely
  const hideInput = isLoadSkill(item) || item.toolName === "get-transaction";

  return (
    <div className="overflow-hidden rounded-md border border-border bg-background/40">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/40"
      >
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="font-medium text-foreground text-xs">{label}</span>
        {summary && (
          <span className="truncate font-mono text-muted-foreground text-xs">
            {summary}
          </span>
        )}
        <span className="ml-auto flex items-center gap-2">
          <StateIcon state={item.state} isStreaming={isStreaming} />
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform",
              isOpen && "rotate-90",
            )}
          />
        </span>
      </button>
      {isOpen && (
        <div className="space-y-3 border-border border-t px-3 py-3">
          {!hideInput && input && (
            <LogSection title="Input">
              <CodeBlock>{input}</CodeBlock>
            </LogSection>
          )}
          {item.errorText ? (
            <p className="text-red-500 text-xs">{item.errorText}</p>
          ) : (
            output &&
            (isLoadSkill(item) ? (
              <Markdown>{output}</Markdown>
            ) : (
              <CodeBlock>{output}</CodeBlock>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function LogSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-muted-foreground text-[10px] uppercase tracking-wide">
        {title}
      </p>
      {children}
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="scrollbar-themed max-h-48 overflow-auto rounded bg-muted/40 p-2 font-mono text-[11px] text-muted-foreground leading-relaxed">
      {children}
    </pre>
  );
}

function Markdown({ children }: { children: string }) {
  return (
    <Streamdown
      parseIncompleteMarkdown
      className="space-y-2 text-muted-foreground/90 text-xs leading-relaxed [&_a]:text-blue-400 [&_a]:underline [&_code]:rounded [&_code]:bg-muted/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_h1]:font-semibold [&_h1]:text-foreground [&_h1]:text-sm [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:text-xs [&_li]:ml-4 [&_li]:list-disc [&_ol_li]:list-decimal [&_strong]:font-semibold [&_strong]:text-foreground [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left"
    >
      {children}
    </Streamdown>
  );
}

function prettify(name: string): string {
  const text = name.replace(/[-_]/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function inputSummary(input: unknown): string | null {
  if (typeof input === "string") return input;
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const obj = input as Record<string, unknown>;
    if (typeof obj.id === "string") return obj.id;
    const values = Object.values(obj);
    if (values.length === 1 && typeof values[0] === "string") return values[0];
  }
  return null;
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && Object.keys(value).length === 0) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
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
