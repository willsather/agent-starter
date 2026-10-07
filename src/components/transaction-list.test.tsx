import {
  fireEvent,
  getAllByRole,
  getByRole,
  getByText,
  queryAllByRole,
  queryByRole,
  within,
} from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  type AnalysisResult,
  analysisSchema,
  buildHighlights,
} from "@/lib/analysis";
import { transactions } from "@/lib/data";

import { TransactionList } from "./transaction-list";

const eve = vi.hoisted(() => ({
  send: vi.fn().mockResolvedValue(undefined),
  reset: vi.fn(),
  cancel: vi.fn().mockResolvedValue(undefined),
  useEveAgent: vi.fn(),
}));

const markdown = vi.hoisted(() => vi.fn());

vi.mock("eve/react", () => ({ useEveAgent: eve.useEveAgent }));
vi.mock("streamdown", () => ({
  Streamdown: ({ children }: { children: ReactNode }) => {
    markdown(children);
    return children;
  },
}));

describe("TransactionList Eve integration", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    eve.cancel.mockReset().mockResolvedValue(undefined);
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    eve.useEveAgent.mockReturnValue({
      status: "ready",
      error: null,
      data: { messages: [] },
      send: eve.send,
      reset: eve.reset,
      cancel: eve.cancel,
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("initially shows one Bot header and a details toggle but no idle status or Restart", () => {
    act(() => root.render(<TransactionList />));
    expect(queryByRole(container, "button", { name: "Restart" })).toBeNull();
    expect(queryByRole(container, "status")).toBeNull();
    const toggle = getByRole(container, "button", { name: "Hide details" });
    const details = getByRole(container, "region", { name: "Agent details" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-controls", details.id);
    expect(details.id).not.toBe("");
    expect(
      within(details).getByRole("textbox", {
        name: "Ask about your transactions",
      }),
    ).toBeVisible();
    expect(
      within(details).getByRole("button", { name: "Send" }).closest("form"),
    ).not.toBeNull();
    expect(details).not.toContainElement(toggle);
    let header = toggle.parentElement;
    while (header && !header.querySelector("svg.lucide-bot"))
      header = header.parentElement;
    expect(header).not.toBeNull();
    expect(header).toHaveTextContent("Ask about your transactions");
    expect(header?.querySelector("svg.lucide-bot")).not.toBeNull();
    expect(header).not.toContainElement(details);
    expect(queryByRole(container, "button", { name: "Agent" })).toBeNull();
    expect(
      queryByRole(container, "button", { name: "Ask another question" }),
    ).toBeNull();
    act(() => fireEvent.click(toggle));
    expect(
      queryByRole(container, "region", { name: "Agent details" }),
    ).toBeNull();
    expect(queryByRole(container, "status")).toBeNull();
    expect(queryByRole(container, "button", { name: "Restart" })).toBeNull();
  });

  it.each([
    {
      name: "Find anomalies",
      classes: ["border-red-500/40", "bg-red-500/10", "text-red-300"],
    },
    {
      name: "Find recurring transactions",
      classes: ["border-blue-500/40", "bg-blue-500/15", "text-blue-300"],
    },
    {
      name: "Find today's transactions",
      classes: ["border-yellow-500/40", "bg-yellow-500/10", "text-yellow-200"],
    },
  ])(
    "gives $name its distinct accent classes without showing idle status",
    ({ name, classes }) => {
      act(() => root.render(<TransactionList />));
      expect(getByRole(container, "button", { name })).toHaveClass(...classes);
      expect(queryByRole(container, "status")).toBeNull();
      expect(queryByRole(container, "button", { name: "Restart" })).toBeNull();
    },
  );

  it("uses a small placeholder without shrinking typed prompt text", () => {
    act(() => root.render(<TransactionList />));
    const textarea = getComposer();
    expect(textarea).toHaveClass("text-base", "placeholder:text-sm");
    expect(textarea).not.toHaveClass("text-sm");
    act(() =>
      fireEvent.change(textarea, {
        target: { value: "Review these payments" },
      }),
    );
    expect(textarea).toHaveValue("Review these payments");
    expect(textarea).toHaveClass("text-base", "placeholder:text-sm");
    expect(queryByRole(container, "status")).toBeNull();
    expect(queryByRole(container, "button", { name: "Restart" })).toBeNull();
  });

  it("Restart clears the conversation output, highlights, expanded reasons, and prompt and restores the initial form", async () => {
    act(() => root.render(<TransactionList />));
    act(() =>
      fireEvent.change(getComposer(), { target: { value: "Unsent draft" } }),
    );
    await act(async () =>
      fireEvent.click(
        getByRole(container, "button", { name: "Find anomalies" }),
      ),
    );
    completeResult({
      mode: "anomalies",
      matches: [{ transaction_id: "TXN011", reason: "Previous reason." }],
      summary: "Previous summary.",
    });
    act(() =>
      fireEvent.click(
        getByRole(container, "button", { name: "Show reason for TXN011" }),
      ),
    );
    expectNoComposer();
    expect(
      getByRole(container, "region", { name: "Agent response" }),
    ).toHaveTextContent("Previous summary.");
    act(() =>
      fireEvent.click(getByRole(container, "button", { name: "Hide details" })),
    );
    await act(async () =>
      fireEvent.click(getByRole(container, "button", { name: "Restart" })),
    );
    expect(eve.reset).toHaveBeenCalledOnce();
    expect(eve.send).toHaveBeenCalledOnce();
    expectReasonIds([]);
    expect(getComposer()).toHaveValue("");
    expect(
      getByRole(container, "button", { name: "Hide details" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      queryByRole(container, "region", { name: "Agent response" }),
    ).toBeNull();
    expect(container).not.toHaveTextContent("Previous summary.");
    expect(container).not.toHaveTextContent("Previous reason.");
    expect(
      queryByRole(container, "button", { name: "Find anomalies" }),
    ).toBeVisible();
    expect(queryByRole(container, "status")).toBeNull();
    expect(queryByRole(container, "button", { name: "Restart" })).toBeNull();
    expect(getByRole(container, "button", { name: "Send" })).toBeDisabled();
    expect(
      getByRole(container, "button", { name: "Find recurring transactions" }),
    ).toBeEnabled();
    expect(
      getByRole(container, "button", { name: "Find today's transactions" }),
    ).toBeEnabled();
  });

  it.each(["submitted", "streaming", "resuming"])(
    "Restart awaits cancellation before resetting an active %s turn and blocks duplicate restarts and sends",
    async (status) => {
      act(() => root.render(<TransactionList />));
      await act(async () =>
        fireEvent.click(
          getByRole(container, "button", { name: "Find anomalies" }),
        ),
      );
      renderAgent(status);
      let finishCancellation!: () => void;
      eve.cancel.mockReturnValueOnce(
        new Promise<void>((resolve) => {
          finishCancellation = resolve;
        }),
      );
      const restart = getByRole(container, "button", { name: "Restart" });
      expect(restart).toBeEnabled();
      await act(async () => fireEvent.click(restart));
      expect(eve.cancel).toHaveBeenCalledOnce();
      expect(eve.reset).not.toHaveBeenCalled();
      expect(
        getByRole(container, "button", { name: "Restart" }),
      ).toBeDisabled();
      await act(async () =>
        fireEvent.click(getByRole(container, "button", { name: "Restart" })),
      );
      expect(eve.cancel).toHaveBeenCalledOnce();
      renderAgent("ready");
      const showDetails = queryByRole(container, "button", {
        name: "Show details",
      });
      if (showDetails) act(() => fireEvent.click(showDetails));
      expectNoComposer();
      expect(
        getByRole(container, "button", { name: "Restart" }),
      ).toBeDisabled();
      expect(eve.send).toHaveBeenCalledOnce();
      await act(async () => finishCancellation());
      expect(eve.reset).toHaveBeenCalledOnce();
      expect(eve.cancel.mock.invocationCallOrder[0]).toBeLessThan(
        eve.reset.mock.invocationCallOrder[0],
      );
      expect(queryByRole(container, "button", { name: "Restart" })).toBeNull();
      expect(
        getByRole(container, "button", { name: "Hide details" }),
      ).toHaveAttribute("aria-expanded", "true");
      expect(getComposer()).toHaveValue("");
      expect(queryByRole(container, "status")).toBeNull();
      expect(
        getByRole(container, "button", { name: "Find anomalies" }),
      ).toBeEnabled();
      expectReasonIds([]);
    },
  );

  it.each([
    "Find anomalies",
    "Find recurring transactions",
    "Find today's transactions",
  ])(
    "immediately sends %s with the analysis schema, removes the composer, and opens details",
    async (suggestion) => {
      act(() => root.render(<TransactionList />));
      act(() =>
        fireEvent.change(getComposer(), { target: { value: "Unsent draft" } }),
      );
      await act(async () =>
        userEvent
          .setup()
          .click(getByRole(container, "button", { name: suggestion })),
      );

      expect(eve.send).toHaveBeenCalledExactlyOnceWith(suggestion, {
        outputSchema: analysisSchema,
      });
      expect(eve.reset).not.toHaveBeenCalled();
      expect(queryByRole(container, "textbox")).toBeNull();
      expect(queryByRole(container, "button", { name: "Send" })).toBeNull();
      expect(getByText(container, suggestion)).toBeInTheDocument();
      expect(
        getByRole(container, "button", { name: "Hide details" }),
      ).toHaveAttribute("aria-expanded", "true");
      const details = getByRole(container, "region", { name: "Agent details" });
      expect(details).toBeVisible();
      expect(
        within(details).getByRole("region", { name: "Agent activity" }),
      ).toBeVisible();
      expect(
        queryByRole(container, "region", { name: "Agent response" }),
      ).toBeNull();
      expectNoComposer();
      expect(getByRole(container, "status")).toHaveClass("text-xs");
      expect(getByRole(container, "status")).not.toHaveClass("text-sm");
      expect(getByRole(container, "button", { name: "Restart" })).toBeEnabled();
      expect(queryByRole(container, "button", { name: "Agent" })).toBeNull();
      expect(
        queryByRole(container, "button", { name: "Ask another question" }),
      ).toBeNull();
    },
  );

  it("requires Restart to ask a new question; Show details never restores the composer after sending", async () => {
    act(() => root.render(<TransactionList />));
    await act(async () =>
      fireEvent.click(
        getByRole(container, "button", { name: "Find anomalies" }),
      ),
    );
    const user = userEvent.setup();
    await act(async () =>
      user.click(getByRole(container, "button", { name: "Hide details" })),
    );
    getByRole(container, "button", { name: "Show details" }).focus();
    await act(async () => user.keyboard("{Enter}"));
    expect(
      getByRole(container, "region", { name: "Agent details" }),
    ).toBeVisible();
    expectNoComposer();
    expect(eve.send).toHaveBeenCalledOnce();
    expect(eve.reset).not.toHaveBeenCalled();
    await act(async () =>
      user.click(getByRole(container, "button", { name: "Restart" })),
    );
    expect(eve.reset).toHaveBeenCalledOnce();
    expect(queryByRole(container, "button", { name: "Restart" })).toBeNull();
    expect(getComposer()).toHaveValue("");
    expect(getByRole(container, "button", { name: "Send" })).toBeDisabled();
    act(() =>
      fireEvent.change(getComposer(), {
        target: { value: "  Show coffee purchases  " },
      }),
    );
    await act(async () =>
      fireEvent.click(getByRole(container, "button", { name: "Send" })),
    );
    expect(eve.send).toHaveBeenNthCalledWith(2, "Show coffee purchases", {
      outputSchema: analysisSchema,
    });
    expect(eve.send).toHaveBeenCalledTimes(2);
    expectNoComposer();
    expect(getByText(container, "Show coffee purchases")).toBeInTheDocument();
    expect(getByRole(container, "button", { name: "Restart" })).toBeEnabled();
  });

  it("supports Enter to send, Shift+Enter for a newline, and rejects blank prompts", async () => {
    act(() => root.render(<TransactionList />));
    const user = userEvent.setup();
    const textarea = getByRole(container, "textbox", {
      name: "Ask about your transactions",
    });
    expect(getByRole(container, "button", { name: "Send" })).toBeDisabled();
    textarea.focus();

    await act(async () =>
      user.type(
        textarea,
        "Show coffee purchases{Shift>}{Enter}{/Shift}this month",
      ),
    );
    expect(textarea).toHaveValue("Show coffee purchases\nthis month");
    expect(eve.send).not.toHaveBeenCalled();
    await act(async () => user.keyboard("{Enter}"));
    expect(eve.send).toHaveBeenCalledWith("Show coffee purchases\nthis month", {
      outputSchema: analysisSchema,
    });
    expectNoComposer();
    expect(
      getByRole(container, "button", { name: "Hide details" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      getByRole(container, "region", { name: "Agent details" }),
    ).toBeVisible();

    await act(async () =>
      user.click(getByRole(container, "button", { name: "Restart" })),
    );
    expect(eve.reset).toHaveBeenCalledOnce();
    expect(queryByRole(container, "button", { name: "Restart" })).toBeNull();
    const reopened = getComposer();
    expect(reopened).toHaveValue("");
    act(() => fireEvent.change(reopened, { target: { value: "   " } }));
    reopened.focus();
    await act(async () => user.keyboard("{Enter}"));
    expect(getByRole(container, "button", { name: "Send" })).toBeDisabled();
    expect(eve.send).toHaveBeenCalledOnce();
  });

  it("blocks the initial prompt while the agent is busy without exposing Restart before a send", () => {
    renderAgent("streaming");
    const textarea = getByRole(container, "textbox", {
      name: "Ask about your transactions",
    });
    act(() =>
      fireEvent.change(textarea, { target: { value: "Next question" } }),
    );
    act(() => fireEvent.keyDown(textarea, { key: "Enter" }));

    expect(textarea).toHaveValue("Next question");
    expect(getByRole(container, "button", { name: "Send" })).toBeDisabled();
    expect(eve.send).not.toHaveBeenCalled();
    expect(queryByRole(container, "button", { name: "Restart" })).toBeNull();
  });

  it("shows only the result summary above the table, not assistant text or structured dumps", async () => {
    renderAgent("ready", [
      { role: "assistant", parts: [{ type: "text", text: "Previous answer" }] },
      {
        role: "user",
        parts: [{ type: "text", text: "Find today's transactions" }],
      },
      {
        role: "assistant",
        parts: [
          { type: "text", text: "Assistant narrative" },
          {
            type: "text",
            text: '{"matches":[],"summary":"Raw assistant dump"}',
          },
        ],
      },
    ]);
    expect(
      queryByRole(container, "region", { name: "Agent response" }),
    ).toBeNull();
    await act(async () =>
      fireEvent.click(
        getByRole(container, "button", { name: "Find today's transactions" }),
      ),
    );
    completeResult({
      mode: "search",
      matches: [],
      summary: "No transactions match today in UTC.",
    });

    expect(
      getByRole(container, "region", { name: "Agent response" }),
    ).toBeVisible();
    expect(container).not.toHaveTextContent("Assistant narrative");
    const details = getByRole(container, "region", { name: "Agent details" });
    const answer = within(details).getByRole("region", {
      name: "Agent response",
    });
    expectNoComposer();
    expect(answer).toHaveTextContent("No transactions match today in UTC.");
    expect(answer).not.toHaveTextContent("Find today's transactions");
    expect(answer).not.toHaveTextContent("Assistant narrative");
    expect(answer).not.toHaveTextContent("Raw assistant dump");
    expect(
      answer.compareDocumentPosition(getByRole(container, "table")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const log = within(details).getByRole("region", { name: "Agent activity" });
    expect(log).not.toHaveTextContent("Previous answer");
    expect(log).not.toHaveTextContent("Assistant narrative");
    expect(log).not.toHaveTextContent("Raw assistant dump");
    expect(log).not.toHaveTextContent("No transactions match today in UTC.");
  });

  it("renders structured results from result.completed events", () => {
    act(() => root.render(<TransactionList />));
    const { onEvent } = eve.useEveAgent.mock.calls[0][0];

    act(() => {
      onEvent({
        type: "result.completed",
        data: {
          result: {
            mode: "anomalies",
            matches: [
              { transaction_id: "TXN011", reason: "Unusually large payment." },
            ],
            summary: "One anomalous transaction found.",
          },
        },
      });
    });

    expect(
      getByText(container, "One anomalous transaction found."),
    ).toBeInTheDocument();
    expect(getByText(container, "Anomaly")).toBeInTheDocument();
    expect(queryByRole(container, "status")).toBeNull();
    expect(queryByRole(container, "button", { name: "Restart" })).toBeNull();
    expect(
      getByRole(container, "button", { name: "Hide details" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      within(
        getByRole(container, "region", { name: "Agent details" }),
      ).getByRole("region", { name: "Agent response" }),
    ).toBeVisible();
  });

  it.each(["submitted", "streaming", "resuming", "ready"])(
    "never restores the composer when details are reopened after sending while %s",
    async (status) => {
      act(() => root.render(<TransactionList />));
      await act(async () =>
        fireEvent.click(
          getByRole(container, "button", { name: "Find anomalies" }),
        ),
      );
      renderAgent(status);
      expectNoComposer();
      act(() =>
        fireEvent.click(
          getByRole(container, "button", { name: "Hide details" }),
        ),
      );
      await act(async () =>
        fireEvent.click(
          getByRole(container, "button", { name: "Show details" }),
        ),
      );
      expect(
        getByRole(container, "region", { name: "Agent details" }),
      ).toBeVisible();
      expect(
        getByRole(container, "region", { name: "Agent activity" }),
      ).toBeVisible();
      expectNoComposer();
      expect(getByRole(container, "button", { name: "Restart" })).toBeEnabled();
      expect(eve.send).toHaveBeenCalledOnce();
      expect(eve.reset).not.toHaveBeenCalled();
      act(() =>
        fireEvent.click(
          getByRole(container, "button", { name: "Hide details" }),
        ),
      );
      expectNoComposer();
    },
  );

  it("does not send Enter during IME composition", () => {
    act(() => root.render(<TransactionList />));
    const textarea = getComposer();
    act(() =>
      fireEvent.change(textarea, { target: { value: "Coffee purchases" } }),
    );
    act(() => fireEvent.keyDown(textarea, { key: "Enter", isComposing: true }));
    expect(eve.send).not.toHaveBeenCalled();
    expect(textarea).toHaveValue("Coffee purchases");
  });

  it.each(["submitted", "streaming", "resuming"])(
    "blocks typed and suggestion sends while %s",
    async (status) => {
      renderAgent(status);
      const textarea = getComposer();
      act(() =>
        fireEvent.change(textarea, { target: { value: "Coffee purchases" } }),
      );
      await act(async () => fireEvent.keyDown(textarea, { key: "Enter" }));
      await act(async () =>
        fireEvent.click(
          getByRole(container, "button", { name: "Find anomalies" }),
        ),
      );
      expect(getByRole(container, "button", { name: "Send" })).toBeDisabled();
      expect(eve.send).not.toHaveBeenCalled();
      expect(textarea).toHaveValue("Coffee purchases");
      expect(
        getByRole(container, "button", { name: "Find anomalies" }),
      ).toBeDisabled();
      expect(queryByRole(container, "button", { name: "Restart" })).toBeNull();
    },
  );

  it.each([
    { mode: "anomalies", label: "Anomaly", color: "red" },
    { mode: "search", label: "Match", color: "yellow" },
  ] as const)(
    "highlights only matching IDs for $mode and exposes keyboard-accessible reasons",
    async ({ mode, label, color }) => {
      act(() => root.render(<TransactionList />));
      completeResult({
        mode,
        matches: [
          { transaction_id: "TXN018", reason: "Review this payment." },
          { transaction_id: "TXN999", reason: "Unknown transaction reason." },
        ],
        summary: "One matching payment.",
      });

      expectReasonIds(["TXN018"]);
      const button = getByRole(container, "button", {
        name: "Show reason for TXN018",
      });
      const row = button.closest("tr");
      expect(row).not.toBeNull();
      expect(row).toHaveTextContent("Apple Store");
      expect(row).toHaveTextContent("iPhone case");
      expect(row).toHaveTextContent("2025-01-19");
      expect(row).toHaveTextContent(label);
      expect(row?.className).toContain(`bg-${color}-`);
      expect(getByText(row as HTMLElement, label).className).toContain(
        `text-${color}-`,
      );
      expect(button).toHaveAttribute("aria-expanded", "false");
      expect(container).not.toHaveTextContent("Unknown transaction reason.");

      const user = userEvent.setup();
      button.focus();
      await act(async () => user.keyboard("{Enter}"));
      const hide = getByRole(container, "button", {
        name: "Hide reason for TXN018",
      });
      expect(hide).toHaveAttribute("aria-expanded", "true");
      expect(getByText(container, "Review this payment.")).toBeVisible();
      hide.focus();
      await act(async () => user.keyboard(" "));
      expect(
        getByRole(container, "button", { name: "Show reason for TXN018" }),
      ).toHaveAttribute("aria-expanded", "false");
      expect(getByRole(container, "table")).not.toHaveTextContent(
        "Review this payment.",
      );
    },
  );

  it("uses distinct recurring merchant colors and highlights only selected eligible groups", () => {
    act(() => root.render(<TransactionList />));
    const result: AnalysisResult = {
      mode: "recurring",
      matches: [
        { transaction_id: "TXN004", reason: "Netflix renews every 30 days." },
        { transaction_id: "TXN009", reason: "Spotify renews every 30 days." },
        { transaction_id: "TXN031", reason: "Singleton subscription." },
        { transaction_id: "TXN001", reason: "Not a same-price cadence." },
        { transaction_id: "TXN999", reason: "Bogus merchant." },
      ],
      summary: "Two recurring merchants.",
    };
    completeResult(result);
    const highlights = buildHighlights(result, transactions);
    const selectedIds = [
      "TXN004",
      "TXN009",
      "TXN051",
      "TXN052",
      "TXN053",
      "TXN054",
    ];
    expectReasonIds(selectedIds);
    expect([...highlights.keys()].sort()).toEqual(selectedIds);
    const legend = getByRole(container, "list", {
      name: "Recurring merchants",
    });
    expect(
      getAllByRole(legend, "listitem")
        .map((item) => item.textContent?.trim())
        .sort(),
    ).toEqual(["Netflix", "Spotify"]);
    const colors = new Map<string, string>();
    for (const [id, highlight] of highlights) {
      const button = getByRole(container, "button", {
        name: `Show reason for ${id}`,
      });
      const row = button.closest("tr") as HTMLTableRowElement;
      expect(row).toHaveTextContent(highlight.merchant);
      expect(getByText(row, "Recurring")).toBeInTheDocument();
      expect(row.getAttribute("style")).toContain(highlight.color);
      expect(row.className).not.toContain("bg-red-");
      expect(row.className).not.toContain("bg-yellow-");
      colors.set(highlight.merchant, highlight.color);
    }
    expect(colors.size).toBe(2);
    expect(new Set(colors.values()).size).toBe(2);
    expect(colors.get("Netflix")).toBe("var(--ds-blue-700)");
    expect(colors.get("Spotify")).toBe("var(--ds-teal-700)");
    expect(container).not.toHaveTextContent("Bogus merchant.");
    expect(container).not.toHaveTextContent("Singleton subscription.");
    expect(container).not.toHaveTextContent("Not a same-price cadence.");
    act(() =>
      fireEvent.click(getByRole(container, "button", { name: "Hide details" })),
    );
    expect(
      queryByRole(container, "list", { name: "Recurring merchants" }),
    ).toBeNull();
    expect(
      queryByRole(container, "region", { name: "Agent response" }),
    ).toBeNull();
    expectReasonIds(selectedIds);
    act(() =>
      fireEvent.click(getByRole(container, "button", { name: "Show details" })),
    );
    expect(
      getByRole(container, "list", { name: "Recurring merchants" }),
    ).toBeVisible();
    expectReasonIds(selectedIds);
  });

  it.each(["anomalies", "recurring", "search"] as const)(
    "clears %s highlights, expanded reasons, and the summary on Restart before the next query",
    async (mode) => {
      act(() => root.render(<TransactionList />));
      await act(async () =>
        fireEvent.click(
          getByRole(container, "button", { name: "Find anomalies" }),
        ),
      );
      const id = mode === "recurring" ? "TXN004" : "TXN011";
      completeResult({
        mode,
        matches: [{ transaction_id: id, reason: "Previous reason." }],
        summary: "Previous summary.",
      });
      act(() =>
        fireEvent.click(
          getByRole(container, "button", { name: `Show reason for ${id}` }),
        ),
      );
      await act(async () =>
        fireEvent.click(getByRole(container, "button", { name: "Restart" })),
      );
      expect(eve.reset).toHaveBeenCalledOnce();
      expect(getComposer()).toHaveValue("");
      expect(queryByRole(container, "button", { name: "Restart" })).toBeNull();
      expectReasonIds([]);
      await act(async () =>
        fireEvent.click(
          getByRole(container, "button", { name: "Find today's transactions" }),
        ),
      );

      expectReasonIds([]);
      expect(getByRole(container, "table")).not.toHaveTextContent(
        "Previous reason.",
      );
      expect(
        queryByRole(container, "region", { name: "Agent response" }),
      ).toBeNull();
      expect(eve.send).toHaveBeenNthCalledWith(2, "Find today's transactions", {
        outputSchema: analysisSchema,
      });
      expect(eve.reset).toHaveBeenCalledOnce();
      expectNoComposer();
    },
  );

  it("auto-opens the completed summary, legend, and tool log without restoring the composer or losing highlights", async () => {
    act(() => root.render(<TransactionList />));
    await act(async () =>
      fireEvent.click(
        getByRole(container, "button", { name: "Find recurring transactions" }),
      ),
    );
    renderAgent("ready", [
      {
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            toolCallId: "renewals",
            toolName: "get-transactions",
            input: {},
            output: transactions,
            state: "output-available",
          },
        ],
      },
    ]);
    completeResult({
      mode: "recurring",
      matches: [
        { transaction_id: "TXN004", reason: "30-day Netflix renewals." },
      ],
      summary: "Three Netflix renewals.",
    });
    expectReasonIds(["TXN004", "TXN051", "TXN052"]);
    expect(getByRole(container, "status")).toHaveTextContent(
      "Analysis complete",
    );
    for (const name of ["Agent details", "Agent response", "Agent activity"]) {
      expect(getByRole(container, "region", { name })).toBeVisible();
    }
    expect(
      getByRole(container, "list", { name: "Recurring merchants" }),
    ).toBeVisible();
    const details = getByRole(container, "region", { name: "Agent details" });
    expectNoComposer();
    expect(
      within(details).getByRole("region", { name: "Agent response" }),
    ).toHaveTextContent("Three Netflix renewals.");
    expect(
      within(details).getByRole("list", { name: "Recurring merchants" }),
    ).toHaveTextContent("Netflix");
    const log = within(details).getByRole("region", { name: "Agent activity" });
    act(() =>
      fireEvent.click(getByRole(log, "button", { name: /^Get transactions/ })),
    );
    expect(log).toHaveTextContent("Transactions loaded into the table.");
    expect(log).not.toHaveTextContent('"amount"');
    expect(log).not.toHaveTextContent('"transaction_id"');
    expectReasonIds(["TXN004", "TXN051", "TXN052"]);
    act(() =>
      fireEvent.click(getByRole(container, "button", { name: "Hide details" })),
    );
    expect(
      queryByRole(container, "region", { name: "Agent details" }),
    ).toBeNull();
    expectReasonIds(["TXN004", "TXN051", "TXN052"]);
  });

  it("rejects malformed completed results", () => {
    act(() => root.render(<TransactionList />));
    const { onEvent } = eve.useEveAgent.mock.calls.at(-1)?.[0] ?? {};
    act(() =>
      onEvent({
        type: "result.completed",
        data: {
          result: {
            mode: "search",
            matches: [{ transaction_id: "TXN011" }],
            summary: "Invalid result.",
          },
        },
      }),
    );
    expectReasonIds([]);
    expect(
      queryByRole(container, "region", { name: "Agent response" }),
    ).toBeNull();
  });

  it.each(["Send", "Enter"])(
    "auto-opens details for a typed prompt submitted with %s",
    async (method) => {
      act(() => root.render(<TransactionList />));
      const user = userEvent.setup();
      await act(async () => user.type(getComposer(), "Review these payments"));
      if (method === "Send") {
        await act(async () =>
          user.click(getByRole(container, "button", { name: "Send" })),
        );
      } else {
        await act(async () => user.keyboard("{Enter}"));
      }
      expect(eve.send).toHaveBeenCalledExactlyOnceWith(
        "Review these payments",
        { outputSchema: analysisSchema },
      );
      expect(
        getByRole(container, "button", { name: "Hide details" }),
      ).toHaveAttribute("aria-expanded", "true");
      expect(
        getByRole(container, "region", { name: "Agent details" }),
      ).toBeVisible();
      expect(
        getByRole(container, "region", { name: "Agent activity" }),
      ).toBeVisible();
      expectNoComposer();
      completeResult({
        mode: "search",
        matches: [],
        summary: "No payments match.",
      });
      expect(
        getByRole(container, "region", { name: "Agent response" }),
      ).toHaveTextContent("No payments match.");
      expect(getByRole(container, "button", { name: "Restart" })).toBeEnabled();
      expect(getByRole(container, "status")).toHaveClass("text-xs");
      expect(getByRole(container, "status")).not.toHaveClass("text-sm");
    },
  );

  it("preserves a manual hide through submitted, streaming, and completed events without clearing highlights", async () => {
    act(() => root.render(<TransactionList />));
    const user = userEvent.setup();
    await act(async () =>
      user.click(
        getByRole(container, "button", { name: "Find recurring transactions" }),
      ),
    );
    expect(
      getByRole(container, "region", { name: "Agent details" }),
    ).toBeVisible();
    await act(async () =>
      userEvent
        .setup()
        .click(getByRole(container, "button", { name: "Hide details" })),
    );
    for (const status of ["submitted", "streaming", "ready"]) {
      renderAgent(status);
      expect(
        getByRole(container, "button", { name: "Show details" }),
      ).toHaveAttribute("aria-expanded", "false");
      expect(
        queryByRole(container, "region", { name: "Agent details" }),
      ).toBeNull();
      expectNoComposer();
    }
    completeResult({
      mode: "recurring",
      matches: [{ transaction_id: "TXN004", reason: "30-day renewals." }],
      summary: "Netflix renews regularly.",
    });
    expect(getByRole(container, "status")).toHaveTextContent(
      "Analysis complete",
    );
    for (const name of ["Agent details", "Agent response", "Agent activity"]) {
      expect(queryByRole(container, "region", { name })).toBeNull();
    }
    expect(
      queryByRole(container, "list", { name: "Recurring merchants" }),
    ).toBeNull();
    expectReasonIds(["TXN004", "TXN051", "TXN052"]);
    await act(async () =>
      userEvent
        .setup()
        .click(getByRole(container, "button", { name: "Show details" })),
    );
    expect(
      getByRole(container, "region", { name: "Agent response" }),
    ).toHaveTextContent("Netflix renews regularly.");
    expect(
      getByRole(container, "list", { name: "Recurring merchants" }),
    ).toHaveTextContent("Netflix");
    expectNoComposer();
    expectReasonIds(["TXN004", "TXN051", "TXN052"]);
  });

  it("toggles details on box background and noninteractive header text pointer releases", () => {
    act(() => root.render(<TransactionList />));
    const box = getAgentBox();
    pointerUp(box);
    expect(
      getByRole(container, "button", { name: "Show details" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      queryByRole(container, "region", { name: "Agent details" }),
    ).toBeNull();
    const title = getByText(box, "Ask about your transactions");
    pointerUp(title);
    expect(
      getByRole(container, "button", { name: "Hide details" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(getComposer()).toBeVisible();
    pointerUp(title);
    expect(
      queryByRole(container, "region", { name: "Agent details" }),
    ).toBeNull();
    pointerUp(box);
    expect(getComposer()).toBeVisible();
    expect(eve.send).not.toHaveBeenCalled();
    expect(queryByRole(container, "status")).toBeNull();
  });

  it("toggles from noninteractive response text without clearing result highlights", async () => {
    act(() => root.render(<TransactionList />));
    await act(async () =>
      userEvent
        .setup()
        .click(getByRole(container, "button", { name: "Find anomalies" })),
    );
    completeResult({
      mode: "anomalies",
      matches: [{ transaction_id: "TXN011", reason: "Review the amount." }],
      summary: "Review this payment.",
    });
    const summary = getByText(
      getByRole(container, "region", { name: "Agent response" }),
      "Review this payment.",
    );
    pointerUp(summary);
    expect(
      getByRole(container, "button", { name: "Show details" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      queryByRole(container, "region", { name: "Agent response" }),
    ).toBeNull();
    expectReasonIds(["TXN011"]);
    pointerUp(getAgentBox());
    expect(
      getByRole(container, "region", { name: "Agent response" }),
    ).toHaveTextContent("Review this payment.");
    expectNoComposer();
    expectReasonIds(["TXN011"]);
  });

  it("ignores non-left pointer releases on the agent box", () => {
    act(() => root.render(<TransactionList />));
    const box = getAgentBox();
    for (const button of [1, 2]) {
      pointerUp(box, button);
      expect(
        getByRole(container, "button", { name: "Hide details" }),
      ).toHaveAttribute("aria-expanded", "true");
      expect(getComposer()).toBeVisible();
    }
    pointerUp(box);
    expect(
      queryByRole(container, "region", { name: "Agent details" }),
    ).toBeNull();
  });

  it("does not toggle the box while text is selected", () => {
    act(() => root.render(<TransactionList />));
    const box = getAgentBox();
    const title = box.querySelector("p");
    expect(title).not.toBeNull();
    const selection = window.getSelection();
    expect(selection).not.toBeNull();
    const range = document.createRange();
    range.selectNodeContents(title as Node);
    selection?.removeAllRanges();
    selection?.addRange(range);
    try {
      expect(selection?.toString()).toBe("Ask about your transactions");
      pointerUp(box);
      expect(
        getByRole(container, "button", { name: "Hide details" }),
      ).toHaveAttribute("aria-expanded", "true");
      expect(getComposer()).toBeVisible();
    } finally {
      selection?.removeAllRanges();
    }
    pointerUp(box);
    expect(
      queryByRole(container, "region", { name: "Agent details" }),
    ).toBeNull();
  });

  it("keeps textarea typing, pointer interactions, and form-label clicks from collapsing details", async () => {
    act(() => root.render(<TransactionList />));
    const textarea = getComposer();
    const user = userEvent.setup();
    await act(async () => user.click(textarea));
    await act(async () => user.type(textarea, "Review my spending"));
    pointerUp(textarea);
    pointerUp(
      getByText(
        textarea.closest("form") as HTMLFormElement,
        "Ask about your transactions",
      ),
    );
    expect(
      getByRole(container, "button", { name: "Hide details" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(textarea).toBeVisible();
    expect(textarea).toHaveValue("Review my spending");
    expect(eve.send).not.toHaveBeenCalled();
  });

  it.each(["a", "input", "select", "form", "pre"])(
    "ignores pointer releases on %s controls and their descendants",
    (tag) => {
      act(() => root.render(<TransactionList />));
      const box = getAgentBox();
      const control = document.createElement(tag);
      if (tag === "a") control.setAttribute("href", "#agent-details");
      box.append(control);
      pointerUp(control);
      expect(
        getByRole(container, "button", { name: "Hide details" }),
      ).toHaveAttribute("aria-expanded", "true");
      if (tag !== "input" && tag !== "select") {
        const child = document.createElement("span");
        child.textContent = "Nested control text";
        control.append(child);
        pointerUp(child);
        expect(
          getByRole(container, "button", { name: "Hide details" }),
        ).toHaveAttribute("aria-expanded", "true");
      }
      control.remove();
      expect(getComposer()).toBeVisible();
    },
  );

  it("toggle button pointer clicks toggle exactly once and Restart returns to open details", async () => {
    act(() => root.render(<TransactionList />));
    const user = userEvent.setup();
    const hide = getByRole(container, "button", { name: "Hide details" });
    const icon = hide.querySelector("svg");
    expect(icon).not.toBeNull();
    await act(async () => user.click(icon as SVGElement));
    expect(
      getByRole(container, "button", { name: "Show details" }),
    ).toHaveAttribute("aria-expanded", "false");
    await act(async () =>
      user.click(getByRole(container, "button", { name: "Show details" })),
    );
    expect(
      getByRole(container, "button", { name: "Hide details" }),
    ).toHaveAttribute("aria-expanded", "true");
    await act(async () =>
      user.click(getByRole(container, "button", { name: "Find anomalies" })),
    );
    expect(
      getByRole(container, "region", { name: "Agent details" }),
    ).toBeVisible();
    expectNoComposer();
    await act(async () =>
      user.click(getByRole(container, "button", { name: "Hide details" })),
    );
    expect(
      queryByRole(container, "region", { name: "Agent details" }),
    ).toBeNull();
    const restart = getByRole(container, "button", { name: "Restart" });
    await act(async () =>
      user.click(restart.querySelector("svg") as SVGElement),
    );
    expect(eve.reset).toHaveBeenCalledOnce();
    expect(eve.send).toHaveBeenCalledOnce();
    expect(
      getByRole(container, "region", { name: "Agent details" }),
    ).toBeVisible();
    expect(getComposer()).toHaveValue("");
    expect(
      getByRole(container, "button", { name: "Hide details" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(queryByRole(container, "button", { name: "Restart" })).toBeNull();
    expect(queryByRole(container, "status")).toBeNull();
  });

  it("tool-card button and icon clicks expand activity without toggling the agent box", async () => {
    act(() => root.render(<TransactionList />));
    const user = userEvent.setup();
    await act(async () =>
      user.click(getByRole(container, "button", { name: "Find anomalies" })),
    );
    renderAgent("ready", [
      {
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            toolCallId: "pointer-tool",
            toolName: "get-transactions",
            input: {},
            output: transactions,
            state: "output-available",
          },
        ],
      },
    ]);
    const log = getByRole(container, "region", { name: "Agent activity" });
    const tool = getByRole(log, "button", { name: /^Get transactions/ });
    await act(async () => user.click(tool));
    expect(
      getByRole(container, "button", { name: "Hide details" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(getByText(log, "Transactions loaded into the table.")).toBeVisible();
    const icon = tool.querySelector("svg");
    expect(icon).not.toBeNull();
    await act(async () => user.click(icon as SVGElement));
    expect(
      getByRole(container, "region", { name: "Agent activity" }),
    ).toBeVisible();
    expect(
      getByRole(container, "button", { name: "Hide details" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(eve.send).toHaveBeenCalledOnce();
    expect(eve.reset).not.toHaveBeenCalled();
    expectNoComposer();
  });

  function getAgentBox() {
    const box = container.querySelector<HTMLDivElement>("[data-agent-box]");
    expect(box).not.toBeNull();
    return box as HTMLDivElement;
  }

  function pointerUp(target: Element, button = 0) {
    const EventType =
      typeof window.PointerEvent === "function"
        ? window.PointerEvent
        : window.MouseEvent;
    act(() =>
      fireEvent(target, new EventType("pointerup", { bubbles: true, button })),
    );
  }

  function expectNoComposer() {
    expect(queryByRole(container, "textbox", { hidden: true })).toBeNull();
    for (const name of [
      "Send",
      "Find anomalies",
      "Find recurring transactions",
      "Find today's transactions",
    ]) {
      expect(
        queryByRole(container, "button", { name, hidden: true }),
      ).toBeNull();
    }
    expect(container.querySelector("form")).toBeNull();
  }

  function getComposer() {
    return getByRole(container, "textbox", {
      name: "Ask about your transactions",
    });
  }

  function completeResult(result: AnalysisResult) {
    const { onEvent } = eve.useEveAgent.mock.calls.at(-1)?.[0] ?? {};
    act(() => onEvent({ type: "result.completed", data: { result } }));
  }

  function expectReasonIds(ids: string[]) {
    const buttons = queryAllByRole(getByRole(container, "table"), "button", {
      name: /^(Show|Hide) reason for /,
    });
    expect(
      buttons.map((button) => button.getAttribute("aria-label")).sort(),
    ).toEqual(ids.map((id) => `Show reason for ${id}`).sort());
  }

  function renderAgent(
    status: string,
    messages: unknown[] = [],
    error: Error | null = null,
  ) {
    eve.useEveAgent.mockReturnValue({
      status,
      error,
      data: { messages },
      send: eve.send,
      reset: eve.reset,
      cancel: eve.cancel,
    });
    act(() => root.render(<TransactionList />));
  }

  it.each(["submitted", "streaming"])(
    "keeps the single header visible while %s with details open after submission",
    async (status) => {
      act(() => root.render(<TransactionList />));
      await act(async () =>
        fireEvent.click(
          getByRole(container, "button", { name: "Find anomalies" }),
        ),
      );
      renderAgent(status);
      const toggle = getByRole(container, "button", { name: "Hide details" });
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(
        getByRole(container, "region", { name: "Agent details" }),
      ).toBeVisible();
      expect(
        getByRole(container, "region", { name: "Agent activity" }),
      ).toBeVisible();
      expect(queryByRole(container, "textbox")).toBeNull();
      expect(getByRole(container, "status")).toHaveTextContent(
        status === "submitted"
          ? "Starting analysis…"
          : "Analyzing transactions…",
      );
      expect(getByRole(container, "button", { name: "Restart" })).toBeEnabled();
      expect(
        toggle.compareDocumentPosition(getByRole(container, "table")) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      const details = getByRole(container, "region", { name: "Agent details" });
      expect(details.id).toBe(toggle.getAttribute("aria-controls"));
      expectNoComposer();
      expect(
        within(details).getByRole("region", { name: "Agent activity" }),
      ).toHaveTextContent("Waiting for agent activity…");
    },
  );

  it("can collapse and reopen all details with the keyboard", async () => {
    renderAgent("streaming");
    const user = userEvent.setup();
    const toggle = getByRole(container, "button", { name: "Hide details" });
    toggle.focus();
    await act(async () => user.keyboard("{Enter}"));
    expect(
      getByRole(container, "button", { name: "Show details" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(queryByRole(container, "textbox")).toBeNull();
    expect(
      queryByRole(container, "region", { name: "Agent activity" }),
    ).toBeNull();
    getByRole(container, "button", { name: "Show details" }).focus();
    await act(async () => user.keyboard(" "));
    expect(
      getByRole(container, "button", { name: "Hide details" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(getComposer()).toBeVisible();
    expect(
      getByRole(container, "region", { name: "Agent activity" }),
    ).toBeVisible();
  });

  it("shows the active tool in the header even with details hidden", async () => {
    act(() => root.render(<TransactionList />));
    await act(async () =>
      fireEvent.click(
        getByRole(container, "button", { name: "Find anomalies" }),
      ),
    );
    act(() =>
      fireEvent.click(getByRole(container, "button", { name: "Hide details" })),
    );
    renderAgent("streaming", [
      {
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            toolCallId: "transaction-1",
            toolName: "get-transactions",
            input: {},
            state: "input-available",
          },
        ],
      },
    ]);
    expect(getByRole(container, "status")).toHaveTextContent(
      "Get transactions…",
    );
    expect(
      getByRole(container, "button", { name: "Show details" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      queryByRole(container, "region", { name: "Agent activity" }),
    ).toBeNull();
  });

  it("opens details on a new submission after Restart without retaining the old summary", async () => {
    renderAgent("ready");
    await act(async () =>
      fireEvent.click(
        getByRole(container, "button", { name: "Find anomalies" }),
      ),
    );
    completeResult({
      mode: "anomalies",
      matches: [],
      summary: "Previous analysis",
    });
    expect(
      getByRole(container, "region", { name: "Agent response" }),
    ).toBeVisible();
    expectNoComposer();
    await act(async () =>
      fireEvent.click(getByRole(container, "button", { name: "Restart" })),
    );
    expect(queryByRole(container, "button", { name: "Restart" })).toBeNull();
    expect(getComposer()).toHaveValue("");
    await act(async () =>
      fireEvent.click(
        getByRole(container, "button", { name: "Find anomalies" }),
      ),
    );
    expect(
      getByRole(container, "button", { name: "Hide details" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      getByRole(container, "region", { name: "Agent details" }),
    ).toBeVisible();
    expect(
      queryByRole(container, "region", { name: "Agent response" }),
    ).toBeNull();
    expect(
      getByRole(container, "region", { name: "Agent activity" }),
    ).toBeVisible();
    expectNoComposer();
  });

  it("keeps manually hidden failure details closed while the status and toggle remain visible", async () => {
    act(() => root.render(<TransactionList />));
    await act(async () =>
      fireEvent.click(
        getByRole(container, "button", { name: "Find anomalies" }),
      ),
    );
    act(() =>
      fireEvent.click(getByRole(container, "button", { name: "Hide details" })),
    );
    renderAgent("error", [], new Error("Connection lost"));
    expect(getByRole(container, "status")).toHaveTextContent("Analysis failed");
    const hiddenError = within(container).queryByText("Connection lost");
    if (hiddenError) expect(hiddenError).not.toBeVisible();
    expect(
      queryByRole(container, "region", { name: "Agent activity" }),
    ).toBeNull();
    act(() =>
      fireEvent.click(getByRole(container, "button", { name: "Show details" })),
    );
    const details = getByRole(container, "region", { name: "Agent details" });
    expect(within(details).getByText("Connection lost")).toBeVisible();
    expectNoComposer();
    expect(getByRole(container, "button", { name: "Restart" })).toBeEnabled();
    expect(
      within(details).getByRole("region", { name: "Agent activity" }),
    ).toHaveTextContent("No activity recorded");
  });

  it("logs only current tool activity and replaces transaction outputs with concise notices", () => {
    renderAgent("ready", [
      {
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            toolCallId: "previous-tool",
            toolName: "previous-activity",
            input: {},
            output: "Old output",
            state: "output-available",
          },
        ],
      },
      {
        role: "user",
        parts: [{ type: "text", text: "Review my transactions" }],
      },
      {
        role: "assistant",
        parts: [
          { type: "text", text: "Assistant-only narrative" },
          {
            type: "text",
            text: '{"transaction_id":"TXN011","reason":"Assistant dump"}',
          },
          {
            type: "dynamic-tool",
            toolCallId: "transactions-1",
            toolName: "get-transactions",
            input: {},
            output: [
              {
                ...transactions[0],
                description: "Full transaction dump marker",
              },
            ],
            state: "output-available",
          },
          {
            type: "dynamic-tool",
            toolCallId: "transaction-1",
            toolName: "get-transaction",
            input: { id: "TXN011" },
            output: {
              ...transactions[10],
              description: "Transaction detail dump marker",
            },
            state: "output-available",
          },
        ],
      },
    ]);
    const details = getByRole(container, "region", { name: "Agent details" });
    const log = within(details).getByRole("region", { name: "Agent activity" });
    const tools = getAllByRole(log, "button");
    expect(tools).toHaveLength(2);
    act(() =>
      fireEvent.click(getByRole(log, "button", { name: /^Get transactions/ })),
    );
    act(() =>
      fireEvent.click(
        getByRole(log, "button", { name: /^Get transaction(?!s)/ }),
      ),
    );

    expect(
      within(log).getByText("Transactions loaded into the table."),
    ).toBeVisible();
    expect(
      within(log).getByText("Transaction details loaded into the table."),
    ).toBeVisible();
    for (const text of [
      "Previous activity",
      "Old output",
      "Assistant-only narrative",
      "Assistant dump",
      "Full transaction dump marker",
      "Transaction detail dump marker",
      '"transaction_id"',
      '"amount"',
    ]) {
      expect(log).not.toHaveTextContent(text);
    }
    expect(markdown).not.toHaveBeenCalled();
  });

  it("uses Eve metadata to label skill calls and renders skill Markdown in the log", () => {
    eve.useEveAgent.mockReturnValue({
      status: "ready",
      error: null,
      data: {
        messages: [
          {
            role: "assistant",
            parts: [
              {
                type: "dynamic-tool",
                toolCallId: "skill-1",
                toolName: "internal-action",
                toolMetadata: {
                  eve: { kind: "load-skill", name: "anomalies" },
                },
                input: { name: "anomalies" },
                output:
                  "## Anomaly detection rules\n\n- Review **large payments**.",
                state: "output-available",
              },
            ],
          },
        ],
      },
      send: eve.send,
      reset: eve.reset,
      cancel: eve.cancel,
    });
    act(() => root.render(<TransactionList />));

    expect(getByText(container, "Load skill")).toBeInTheDocument();
    const log = getByRole(container, "region", { name: "Agent activity" });
    act(() =>
      fireEvent.click(getByRole(log, "button", { name: /Load skill/ })),
    );
    expect(markdown).toHaveBeenCalledWith(
      "## Anomaly detection rules\n\n- Review **large payments**.",
    );
    expect(log.querySelector("pre")).toBeNull();
  });
});
