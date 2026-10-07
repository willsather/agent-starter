"use client";

import { useEveAgent } from "eve/react";
import {
  AlertTriangle,
  ArrowUp,
  BookOpen,
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleX,
  FileSearch,
  Loader2,
  Repeat2,
  RotateCcw,
  Table2,
  Wrench,
} from "lucide-react";
import type { ComponentType, CSSProperties, PointerEvent } from "react";
import { useId, useMemo, useState } from "react";
import { Streamdown } from "streamdown";

import {
  type AnalysisResult,
  analysisSchema,
  buildHighlights,
  type RowHighlight,
} from "@/lib/analysis";
import { transactions } from "@/lib/data";
import { cn } from "@/lib/utils";

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

type LogItem = ToolLogItem;

type IconType = ComponentType<{ className?: string }>;

const suggestedPrompts = [
  {
    prompt: "Find anomalies",
    Icon: AlertTriangle,
    accent:
      "border-red-500/40 bg-red-500/10 text-red-300 hover:border-red-400/70 hover:bg-red-500/20",
  },
  {
    prompt: "Find recurring transactions",
    Icon: Repeat2,
    accent:
      "border-blue-500/40 bg-blue-500/15 text-blue-300 hover:border-blue-400/70 hover:bg-blue-500/25",
  },
  {
    prompt: "Find today's transactions",
    Icon: CalendarDays,
    accent:
      "border-yellow-500/40 bg-yellow-500/10 text-yellow-200 hover:border-yellow-400/70 hover:bg-yellow-500/20",
  },
];

export function TransactionList() {
  const logId = useId();
  const promptId = useId();
  const [prompt, setPrompt] = useState("");
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [isRestarting, setIsRestarting] = useState(false);
  const [restartError, setRestartError] = useState<string | null>(null);
  const [openTools, setOpenTools] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedMerchants, setSelectedMerchants] =
    useState<Set<string> | null>(null);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  const agent = useEveAgent({
    onEvent(event) {
      if (event.type === "result.completed") {
        const parsed = analysisSchema.safeParse(event.data.result);
        if (parsed.success) {
          setResult(parsed.data);
          setSelectedMerchants(null);
          setShowAllTransactions(false);
          setExpandedId(null);
        }
      }
    },
  });

  const { status, error, data } = agent;
  const isLoading = status === "submitted" || status === "streaming";
  const isStreaming = status === "streaming";

  const highlights = buildHighlights(result, transactions);
  const merchantLegend = [
    ...new Map(
      [...highlights.values()].map((highlight) => [
        highlight.merchant.trim().toLowerCase(),
        highlight,
      ]),
    ).values(),
  ];

  const activeMerchants =
    selectedMerchants ??
    new Set(
      merchantLegend.map((highlight) =>
        highlight.merchant.trim().toLowerCase(),
      ),
    );
  const isRecurringResult = result?.mode === "recurring";
  const matchingTransactions = transactions.filter((transaction) => {
    const highlight = highlights.get(transaction.id);
    return (
      highlight &&
      (!isRecurringResult ||
        activeMerchants.has(highlight.merchant.trim().toLowerCase()))
    );
  });
  const visibleTransactions =
    result && !showAllTransactions ? matchingTransactions : transactions;
  const highlightedCount = showAllTransactions
    ? highlights.size
    : matchingTransactions.length;

  function toggleMerchant(merchant: string) {
    setShowAllTransactions(false);
    setSelectedMerchants((previous) => {
      const next = new Set(previous ?? activeMerchants);
      const key = merchant.trim().toLowerCase();
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setExpandedId(null);
  }

  // keep transaction payloads out of the visible activity log
  const logItems = useMemo<LogItem[]>(() => {
    const items: LogItem[] = [];
    const latestUserIndex = data.messages.findLastIndex(
      (message) => message.role === "user",
    );
    for (const message of data.messages.slice(latestUserIndex + 1)) {
      if (message.role !== "assistant") continue;
      for (const part of message.parts) {
        if (part.type === "dynamic-tool") {
          items.push({
            kind: "tool",
            id: part.toolCallId,
            toolName: part.toolName,
            actionKind: part.toolMetadata?.eve?.kind ?? "tool-call",
            name: part.toolMetadata?.eve?.name,
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

  const activeTool = logItems.findLast(
    (item): item is ToolLogItem =>
      item.kind === "tool" &&
      !["output-available", "output-error", "output-denied"].includes(
        item.state,
      ),
  );
  const logStatus = isRestarting
    ? "Restarting…"
    : status === "error" || restartError
      ? "Analysis failed"
      : status === "resuming"
        ? "Restoring session…"
        : status === "submitted"
          ? "Starting analysis…"
          : isLoading
            ? activeTool
              ? `${toolPresentation(activeTool).label}…`
              : "Analyzing transactions…"
            : result
              ? "Analysis complete"
              : "Ready";

  function toggleTool(id: string) {
    setOpenTools((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function sendPrompt(value = prompt) {
    const message = value.trim();
    if (!message || isLoading || status === "resuming" || isRestarting) return;

    setExpandedId(null);
    setResult(null);
    setSelectedMerchants(null);
    setShowAllTransactions(false);
    setOpenTools(new Set());
    setDetailsOpen(true);
    setRestartError(null);
    setSubmittedPrompt(message);
    setPrompt("");
    void agent.send(message, { outputSchema: analysisSchema });
  }

  function toggleDetailsFromBox(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || window.getSelection()?.toString()) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (
      target.closest(
        "button, a, input, textarea, select, form, pre, [role='button']",
      )
    )
      return;
    setDetailsOpen((open) => !open);
  }

  async function restartAgent() {
    if (isRestarting) return;
    setIsRestarting(true);
    setRestartError(null);
    try {
      if (isLoading || status === "resuming") await agent.cancel();
      agent.reset();
      setPrompt("");
      setSubmittedPrompt("");
      setResult(null);
      setSelectedMerchants(null);
      setShowAllTransactions(false);
      setExpandedId(null);
      setOpenTools(new Set());
      setDetailsOpen(true);
      requestAnimationFrame(() => document.getElementById(promptId)?.focus());
    } catch (cause) {
      setRestartError(
        cause instanceof Error ? cause.message : "Unable to restart the agent.",
      );
      setDetailsOpen(true);
    } finally {
      setIsRestarting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div
        data-agent-box=""
        onPointerUp={toggleDetailsFromBox}
        className="cursor-pointer overflow-hidden rounded-lg border border-border bg-card/50"
      >
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex min-w-0 flex-1 basis-full items-center gap-3 sm:basis-auto">
            <Bot
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-muted-foreground"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <p className="min-w-0 truncate font-medium text-sm">
                {submittedPrompt || "Ask about your transactions"}
              </p>
              {(submittedPrompt ||
                isLoading ||
                isRestarting ||
                status === "resuming" ||
                status === "error" ||
                restartError) && (
                <span
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  className="inline-flex shrink-0 items-center gap-2 text-muted-foreground text-xs"
                >
                  {(isLoading || isRestarting || status === "resuming") && (
                    <Loader2
                      aria-hidden="true"
                      className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                    />
                  )}
                  {logStatus}
                </span>
              )}
            </div>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {submittedPrompt && (
              <button
                type="button"
                onClick={() => void restartAgent()}
                disabled={isRestarting}
                className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-muted-foreground text-xs hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
                Restart
              </button>
            )}
            <button
              type="button"
              aria-expanded={detailsOpen}
              aria-controls={logId}
              onClick={() => setDetailsOpen((open) => !open)}
              className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-muted-foreground text-xs hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {detailsOpen ? "Hide details" : "Show details"}
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "h-4 w-4 transition-transform motion-reduce:transition-none",
                  detailsOpen && "rotate-180",
                )}
              />
            </button>
          </div>
        </div>
        <section
          id={logId}
          aria-label="Agent details"
          hidden={!detailsOpen}
          className="border-border border-t"
        >
          {detailsOpen && (
            <>
              {!submittedPrompt && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    sendPrompt();
                  }}
                >
                  <div className="p-4">
                    <label htmlFor={promptId} className="sr-only">
                      Ask about your transactions
                    </label>
                    <textarea
                      id={promptId}
                      name="prompt"
                      rows={3}
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          !event.shiftKey &&
                          !event.nativeEvent.isComposing
                        ) {
                          event.preventDefault();
                          sendPrompt();
                        }
                      }}
                      placeholder="Ask a question or choose a suggestion below…"
                      className="block max-h-64 min-h-24 w-full resize-y rounded-md border border-input bg-background p-3 text-base placeholder:text-muted-foreground placeholder:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="flex flex-col gap-3 border-border border-t px-4 py-3 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                      {suggestedPrompts.map(
                        ({ prompt: suggestion, Icon, accent }) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => sendPrompt(suggestion)}
                            disabled={
                              isLoading || status === "resuming" || isRestarting
                            }
                            className={cn(
                              "inline-flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-9",
                              accent,
                            )}
                          >
                            <Icon
                              aria-hidden="true"
                              className="h-3.5 w-3.5 shrink-0"
                            />
                            {suggestion}
                          </button>
                        ),
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={
                        !prompt.trim() ||
                        isLoading ||
                        status === "resuming" ||
                        isRestarting
                      }
                      className="inline-flex min-h-11 items-center gap-2 self-end rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
                    >
                      {isLoading ? (
                        <Loader2
                          aria-hidden="true"
                          className="h-4 w-4 animate-spin motion-reduce:animate-none"
                        />
                      ) : (
                        <ArrowUp aria-hidden="true" className="h-4 w-4" />
                      )}
                      Send
                    </button>
                  </div>
                </form>
              )}
              {result && (
                <section
                  aria-label="Agent response"
                  className="space-y-3 border-border border-t p-4"
                >
                  <p className="text-muted-foreground text-sm">
                    {result.summary}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {highlightedCount === 0
                      ? isRecurringResult && merchantLegend.length > 0
                        ? "No merchants selected."
                        : "No matching transactions."
                      : `${highlightedCount} ${highlightedCount === 1 ? "transaction highlighted" : "transactions highlighted"} below. Select a highlighted row's details for the reason.`}
                  </p>
                  {result.mode === "recurring" && merchantLegend.length > 0 && (
                    <ul
                      aria-label="Recurring merchants"
                      className="flex flex-wrap gap-x-4 gap-y-2"
                    >
                      {merchantLegend.map((highlight) => {
                        const selected = activeMerchants.has(
                          highlight.merchant.trim().toLowerCase(),
                        );
                        return (
                          <li key={highlight.merchant}>
                            <button
                              type="button"
                              aria-pressed={selected}
                              onClick={() => toggleMerchant(highlight.merchant)}
                              className={cn(
                                "inline-flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9",
                                selected
                                  ? "opacity-100"
                                  : "opacity-50 hover:opacity-100",
                              )}
                              style={{
                                borderColor: selected
                                  ? `color-mix(in srgb, ${highlight.color} 65%, transparent)`
                                  : "var(--border)",
                                backgroundColor: selected
                                  ? `color-mix(in srgb, ${highlight.color} 15%, transparent)`
                                  : undefined,
                              }}
                            >
                              <span
                                aria-hidden="true"
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: highlight.color }}
                              />
                              {highlight.merchant}
                              {selected && (
                                <Check
                                  aria-hidden="true"
                                  className="h-3.5 w-3.5"
                                />
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              )}
              {(submittedPrompt ||
                isLoading ||
                logItems.length > 0 ||
                result ||
                status === "error") && (
                <section
                  aria-label="Agent activity"
                  className="scrollbar-themed max-h-[32rem] space-y-2 overflow-y-auto overscroll-contain border-border border-t p-3"
                >
                  {logItems.length === 0 ? (
                    <p className="px-1 py-3 text-muted-foreground text-sm">
                      {status === "error"
                        ? "No activity recorded. Restart to try again."
                        : "Waiting for agent activity…"}
                    </p>
                  ) : (
                    logItems.map((item) => (
                      <ToolCard
                        key={item.id}
                        item={item}
                        isOpen={openTools.has(item.id)}
                        isStreaming={isStreaming}
                        onToggle={() => toggleTool(item.id)}
                      />
                    ))
                  )}
                </section>
              )}
              {(status === "error" || restartError) && (
                <p
                  role="alert"
                  className="border-border border-t bg-red-500/10 p-4 text-red-400 text-sm"
                >
                  {restartError || error?.message || "Analysis failed"}
                </p>
              )}
            </>
          )}
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-semibold text-lg">Transactions</h2>
          <span
            aria-live="polite"
            aria-atomic="true"
            className="text-muted-foreground text-xs tabular-nums"
          >
            {result
              ? `${visibleTransactions.length} of ${transactions.length} transactions`
              : `${transactions.length} transactions`}
          </span>
        </div>
        {result && (
          <fieldset className="inline-flex min-w-0 max-w-full rounded-lg border border-border bg-muted/30 p-1">
            <legend className="sr-only">Transaction view</legend>
            {[
              { label: result.label, showAll: false },
              { label: "All transactions", showAll: true },
            ].map(({ label, showAll }) => (
              <button
                key={showAll ? "all" : "filtered"}
                type="button"
                title={label}
                aria-pressed={showAllTransactions === showAll}
                onClick={() => {
                  setShowAllTransactions(showAll);
                  setExpandedId(null);
                }}
                className={cn(
                  "min-h-11 min-w-0 truncate rounded-md px-3 py-2 font-medium text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9",
                  showAll && "shrink-0",
                  showAllTransactions === showAll
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </fieldset>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card/50 backdrop-blur-sm">
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
            {visibleTransactions.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-muted-foreground text-sm"
                >
                  {isRecurringResult && merchantLegend.length > 0
                    ? "Select a merchant in the agent details to show transactions."
                    : "No matching transactions. Switch to All transactions to see the full list."}
                </td>
              </tr>
            )}
            {visibleTransactions.map((txn) => {
              const highlight = highlights.get(txn.id);
              const isExpanded = expandedId === txn.id;

              return (
                <TransactionRow
                  key={txn.id}
                  transaction={txn}
                  highlight={highlight}
                  isExpanded={isExpanded}
                  onToggle={() => setExpandedId(isExpanded ? null : txn.id)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function isLoadSkill(item: ToolLogItem): boolean {
  return (
    item.actionKind === "load-skill" ||
    item.toolName === "load_skill" ||
    item.toolName === "eve:load-skill"
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
  const isTransactionTool =
    item.toolName === "get-transactions" || item.toolName === "get-transaction";
  const output =
    item.errorText ??
    (isTransactionTool && item.state === "output-available"
      ? item.toolName === "get-transactions"
        ? "Transactions loaded into the table."
        : "Transaction details loaded into the table."
      : formatValue(item.output));
  const input = formatValue(item.input);
  const hideInput = isLoadSkill(item) || isTransactionTool;

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
  highlight?: RowHighlight;
  isExpanded: boolean;
  onToggle: () => void;
};

function TransactionRow({
  transaction,
  highlight,
  isExpanded,
  onToggle,
}: TransactionRowProps) {
  const { id, date, name, description, amount } = transaction;
  const reasonId = useId();
  const isAnomaly = highlight?.mode === "anomalies";
  const isRecurring = highlight?.mode === "recurring";
  const isSearch = highlight?.mode === "search";
  const label = isAnomaly ? "Anomaly" : isRecurring ? "Recurring" : "Match";
  const recurringStyle = isRecurring
    ? ({
        "--merchant-color": highlight.color,
        backgroundColor:
          "color-mix(in srgb, var(--merchant-color) 30%, transparent)",
      } as CSSProperties)
    : undefined;

  return (
    <>
      <tr
        data-highlight={highlight?.mode}
        style={recurringStyle}
        className={cn(
          "border-border border-b transition-colors",
          isAnomaly && "border-red-500/20 bg-red-500/10",
          isSearch && "border-yellow-500/30 bg-yellow-400/20",
        )}
      >
        <td className="px-4 py-3 font-mono text-muted-foreground">{date}</td>
        <td className="px-4 py-3">
          <span className="flex items-center gap-2">
            {name}
            {highlight && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-xs",
                  isAnomaly && "bg-red-500/20 text-red-400",
                  isSearch && "bg-yellow-400/20 text-yellow-300",
                  isRecurring && "bg-background/30",
                )}
                style={
                  isRecurring
                    ? { color: highlight.color.replace("-700", "-900") }
                    : undefined
                }
              >
                {isAnomaly ? (
                  <AlertTriangle aria-hidden="true" className="h-3 w-3" />
                ) : isRecurring ? (
                  <Repeat2 aria-hidden="true" className="h-3 w-3" />
                ) : (
                  <Check aria-hidden="true" className="h-3 w-3" />
                )}
                {label}
              </span>
            )}
          </span>
        </td>
        <td className="px-4 py-3 text-muted-foreground">{description}</td>
        <td className="px-4 py-3 text-right font-mono">
          ${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </td>
        <td className="px-4 py-3">
          {highlight && (
            <button
              type="button"
              aria-label={`${isExpanded ? "Hide" : "Show"} reason for ${id}`}
              aria-expanded={isExpanded}
              aria-controls={reasonId}
              onClick={onToggle}
              className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform motion-reduce:transition-none",
                  isExpanded && "rotate-180",
                )}
              />
            </button>
          )}
        </td>
      </tr>
      {highlight && isExpanded && (
        <tr
          id={reasonId}
          style={recurringStyle}
          className={cn(
            "border-border border-b",
            isAnomaly && "bg-red-500/5",
            isSearch && "bg-yellow-400/10",
          )}
        >
          <td colSpan={5} className="px-4 py-3 text-sm">
            <span className="font-medium">Reason: </span>
            <span className="text-muted-foreground">{highlight.reason}</span>
          </td>
        </tr>
      )}
    </>
  );
}
