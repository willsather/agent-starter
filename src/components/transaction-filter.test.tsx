import {
  fireEvent,
  getByRole,
  getByText,
  queryByRole,
  within,
} from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type AnalysisResult, buildHighlights } from "@/lib/analysis";
import { transactions } from "@/lib/data";

import { TransactionList } from "./transaction-list";

const eve = vi.hoisted(() => ({
  send: vi.fn().mockResolvedValue(undefined),
  reset: vi.fn(),
  cancel: vi.fn().mockResolvedValue(undefined),
  useEveAgent: vi.fn(),
}));

vi.mock("eve/react", () => ({ useEveAgent: eve.useEveAgent }));
vi.mock("streamdown", () => ({
  Streamdown: ({ children }: { children: ReactNode }) => children,
}));

const netflixIds = ["TXN004", "TXN051", "TXN052"];
const spotifyIds = ["TXN009", "TXN053", "TXN054"];
const planetIds = ["TXN017", "TXN057", "TXN058"];
const recurringIds = [...netflixIds, ...spotifyIds];
const allIds = transactions.map((transaction) => transaction.id);
const modes = ["anomalies", "search", "recurring"] as const;

function analysis(
  mode: AnalysisResult["mode"],
  ids = mode === "recurring" ? ["TXN004", "TXN009"] : ["TXN011"],
  label = mode === "recurring" ? "Recurring" : "Anomalies",
): AnalysisResult {
  return {
    mode,
    label,
    matches: ids.map((transaction_id) => ({
      transaction_id,
      reason: `Reason for ${transaction_id}.`,
    })),
    summary: `${mode} result.`,
  };
}

describe("TransactionList transaction filters", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
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
    act(() => root.render(<TransactionList />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("shows all 58 unhighlighted transactions before a result", () => {
    expect(transactions).toHaveLength(58);
    expectTransactions(allIds);
    expect(getByText(container, "58 transactions")).toBeVisible();
    expect(
      queryByRole(container, "group", { name: "Transaction view" }),
    ).toBeNull();
    expectHighlights(null);
  });

  it.each(modes)(
    "defaults a %s result to highlighted matching rows only",
    (mode) => {
      const result = analysis(mode);
      completeResult(result);
      expectTransactions(mode === "recurring" ? recurringIds : ["TXN011"]);
      expectView(false);
      expectHighlights(result);
      if (mode === "recurring") {
        const legend = getByRole(container, "list", {
          name: "Recurring merchants",
        });
        expect(within(legend).getAllByRole("button")).toHaveLength(2);
        expectNativeToggle(merchant("Netflix"), true);
        expectNativeToggle(merchant("Spotify"), true);
      }
    },
  );

  it.each(modes)(
    "shows all 58 rows with every original %s highlight in All transactions",
    (mode) => {
      const result = analysis(mode);
      completeResult(result);
      const originalHighlights = highlightSnapshot();
      click(viewButton("All transactions"));
      expectTransactions(allIds);
      expectView(true);
      expectHighlights(result);
      expect(highlightSnapshot()).toEqual(originalHighlights);
      click(viewButton("filtered"));
      expectTransactions(mode === "recurring" ? recurringIds : ["TXN011"]);
      expectView(false);
      expect(highlightSnapshot()).toEqual(originalHighlights);
    },
  );

  it.each([
    { mode: "anomalies", label: "Anomalies" },
    { mode: "recurring", label: "Recurring" },
    { mode: "search", label: "Today" },
    { mode: "search", label: "Highest" },
    { mode: "search", label: "Groceries" },
    { mode: "anomalies", label: "Groceries" },
    { mode: "recurring", label: "Groceries" },
  ] as const)(
    "uses the agent label $label exactly for $mode without changing native view toggles or highlights",
    ({ mode, label }) => {
      const result = analysis(mode, undefined, label);
      completeResult(result);
      const group = within(
        getByRole(container, "group", { name: "Transaction view" }),
      );
      const filtered = group.getByRole<HTMLButtonElement>("button", {
        name: label,
      });
      expect(filtered.textContent).toBe(label);
      expect(group.getAllByRole("button")).toHaveLength(2);
      expect(container).not.toHaveTextContent("Highlighted only");
      expectView(false);
      expectTransactions(mode === "recurring" ? recurringIds : ["TXN011"]);
      expectHighlights(result);
      const originalHighlights = highlightSnapshot();
      click(viewButton("All transactions"));
      expectView(true);
      expectTransactions(allIds);
      expectHighlights(result);
      expect(highlightSnapshot()).toEqual(originalHighlights);
      click(filtered);
      expectView(false);
      expectTransactions(mode === "recurring" ? recurringIds : ["TXN011"]);
      expect(highlightSnapshot()).toEqual(originalHighlights);
      expect(filtered.textContent).toBe(label);
    },
  );

  it("replaces the filtered button label on a new result with the same mode", () => {
    completeResult(analysis("search", ["TXN011"], "Today"));
    expect(viewButton("filtered").textContent).toBe("Today");
    click(viewButton("All transactions"));
    const result = analysis("search", ["TXN018"], "Groceries");
    completeResult(result);
    const group = within(
      getByRole(container, "group", { name: "Transaction view" }),
    );
    expect(group.queryByRole("button", { name: "Today" })).toBeNull();
    expect(viewButton("filtered").textContent).toBe("Groceries");
    expect(container).not.toHaveTextContent("Highlighted only");
    expectView(false);
    expectTransactions(["TXN018"]);
    expectHighlights(result);
    click(viewButton("All transactions"));
    expectView(true);
    click(group.getByRole("button", { name: "Groceries" }));
    expectView(false);
    expectTransactions(["TXN018"]);
  });

  it("filters recurring matches through buildHighlights, expanding series but excluding invalid matches", () => {
    const result = analysis("recurring", [
      "TXN051",
      "TXN054",
      "TXN011",
      "TXN018",
      "missing",
    ]);
    expect([...buildHighlights(result, transactions).keys()].sort()).toEqual(
      recurringIds.toSorted(),
    );
    completeResult(result);
    expectTransactions(recurringIds);
    expectHighlights(result);
    const legend = getByRole(container, "list", {
      name: "Recurring merchants",
    });
    expect(
      within(legend)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Netflix", "Spotify"]);
    expect(
      queryByRole(container, "button", { name: "Show reason for TXN011" }),
    ).toBeNull();
  });

  it("removes a deselected recurring series and shows an empty state when the last vendor is deselected", () => {
    completeResult(analysis("recurring"));
    click(merchant("Netflix"));
    expectNativeToggle(merchant("Netflix"), false);
    expectNativeToggle(merchant("Spotify"), true);
    expectTransactions(spotifyIds);
    click(merchant("Spotify"));
    expectNativeToggle(merchant("Spotify"), false);
    expectTransactions([]);
    expectView(false);
    expect(getByText(container, "No merchants selected.")).toBeVisible();
    expect(getByRole(container, "table")).toHaveTextContent(
      "Select a merchant in the agent details to show transactions.",
    );
    click(merchant("Netflix"));
    expectTransactions(netflixIds);
    expectNativeToggle(merchant("Netflix"), true);
    expectNativeToggle(merchant("Spotify"), false);
  });

  it("retains deselected vendors and all original highlights while switching between table views", () => {
    const result = analysis("recurring");
    completeResult(result);
    const originalHighlights = highlightSnapshot();
    click(merchant("Netflix"));
    expectTransactions(spotifyIds);
    click(viewButton("All transactions"));
    expectTransactions(allIds);
    expectView(true);
    expectNativeToggle(merchant("Netflix"), false);
    expectHighlights(result);
    expect(highlightSnapshot()).toEqual(originalHighlights);
    click(viewButton("filtered"));
    expectTransactions(spotifyIds);
    expectView(false);
    expectNativeToggle(merchant("Netflix"), false);
    expectNativeToggle(merchant("Spotify"), true);
    click(merchant("Spotify"));
    expectTransactions([]);
    click(viewButton("All transactions"));
    expectTransactions(allIds);
    expectHighlights(result);
    click(viewButton("filtered"));
    expectTransactions([]);
    expectNativeToggle(merchant("Netflix"), false);
    expectNativeToggle(merchant("Spotify"), false);
  });

  it("returns to filtered view when a vendor is toggled in All transactions", () => {
    completeResult(analysis("recurring"));
    click(viewButton("All transactions"));
    click(merchant("Netflix"));
    expectView(false);
    expectTransactions(spotifyIds);
    click(viewButton("All transactions"));
    click(merchant("Netflix"));
    expectView(false);
    expectTransactions(recurringIds);
    expectNativeToggle(merchant("Netflix"), true);
  });

  it.each([false, true])(
    "preserves vendor selection and showAll=%s when details are hidden and shown",
    (showAll) => {
      completeResult(analysis("recurring"));
      click(merchant("Netflix"));
      if (showAll) click(viewButton("All transactions"));
      const expectedIds = showAll ? allIds : spotifyIds;
      click(getByRole(container, "button", { name: "Hide details" }));
      expect(
        queryByRole(container, "region", { name: "Agent details" }),
      ).toBeNull();
      expectTransactions(expectedIds);
      expectView(showAll);
      click(getByRole(container, "button", { name: "Show details" }));
      expectTransactions(expectedIds);
      expectView(showAll);
      expectNativeToggle(merchant("Netflix"), false);
      expectNativeToggle(merchant("Spotify"), true);
    },
  );

  it.each(["button", "swatch", "check"])(
    "does not collapse agent details on a legend %s pointer release and click",
    (target) => {
      completeResult(analysis("recurring"));
      const button = merchant("Netflix");
      const element =
        target === "swatch"
          ? button.querySelector("span")
          : target === "check"
            ? button.querySelector("svg")
            : button;
      expect(element).not.toBeNull();
      const EventType =
        typeof window.PointerEvent === "function"
          ? window.PointerEvent
          : window.MouseEvent;
      act(() => {
        element?.dispatchEvent(
          new EventType("pointerup", { bubbles: true, button: 0 }),
        );
      });
      expect(
        getByRole(container, "region", { name: "Agent details" }),
      ).toBeVisible();
      click(element as Element);
      expect(
        getByRole(container, "region", { name: "Agent details" }),
      ).toBeVisible();
      expect(
        getByRole(container, "button", { name: "Hide details" }),
      ).toHaveAttribute("aria-expanded", "true");
      expectTransactions(spotifyIds);
      expectNativeToggle(merchant("Netflix"), false);
    },
  );

  it.each(modes)(
    "defaults an empty %s result to zero rows with an All transactions affordance",
    (mode) => {
      completeResult(analysis(mode, []));
      expectTransactions([]);
      expectView(false);
      expect(
        queryByRole(container, "list", { name: "Recurring merchants" }),
      ).toBeNull();
      expect(getByRole(container, "table")).toHaveTextContent(
        "No matching transactions. Switch to All transactions to see the full list.",
      );
      click(viewButton("All transactions"));
      expectTransactions(allIds);
      expectView(true);
      expectHighlights(null);
      click(viewButton("filtered"));
      expectTransactions([]);
    },
  );

  it("shows zero recurring rows when all supplied matches fail recurring validation", () => {
    completeResult(analysis("recurring", ["TXN011", "TXN018", "missing"]));
    expectTransactions([]);
    expectView(false);
    expect(
      queryByRole(container, "list", { name: "Recurring merchants" }),
    ).toBeNull();
    click(viewButton("All transactions"));
    expectTransactions(allIds);
    expectHighlights(null);
  });

  it("Restart restores all 58 rows, clears highlights and selection, and allows fresh vendor selection", async () => {
    await act(async () =>
      fireEvent.click(
        getByRole(container, "button", { name: "Find recurring transactions" }),
      ),
    );
    completeResult(analysis("recurring"));
    click(merchant("Netflix"));
    click(merchant("Spotify"));
    click(viewButton("All transactions"));
    click(getByRole(container, "button", { name: "Show reason for TXN004" }));
    click(getByRole(container, "button", { name: "Hide details" }));
    await act(async () =>
      fireEvent.click(getByRole(container, "button", { name: "Restart" })),
    );
    expect(eve.reset).toHaveBeenCalledOnce();
    expectTransactions(allIds);
    expectHighlights(null);
    expect(getByText(container, "58 transactions")).toBeVisible();
    expect(
      queryByRole(container, "group", { name: "Transaction view" }),
    ).toBeNull();
    expect(
      queryByRole(container, "list", { name: "Recurring merchants" }),
    ).toBeNull();
    expect(getByRole(container, "table")).not.toHaveTextContent(
      "Reason for TXN004.",
    );
    completeResult(analysis("recurring"));
    expectTransactions(recurringIds);
    expectView(false);
    expectNativeToggle(merchant("Netflix"), true);
    expectNativeToggle(merchant("Spotify"), true);
  });

  it.each(modes)(
    "a new %s result resets All transactions and stale recurring selections",
    (mode) => {
      completeResult(analysis("recurring"));
      click(merchant("Netflix"));
      click(merchant("Spotify"));
      click(viewButton("All transactions"));
      const result = analysis(
        mode,
        mode === "recurring" ? ["TXN004", "TXN017"] : ["TXN011"],
      );
      completeResult(result);
      expectTransactions(
        mode === "recurring" ? [...netflixIds, ...planetIds] : ["TXN011"],
      );
      expectView(false);
      expectHighlights(result);
      expect(queryByRole(container, "button", { name: "Spotify" })).toBeNull();
      if (mode === "recurring") {
        expectNativeToggle(merchant("Netflix"), true);
        expectNativeToggle(merchant("Planet Fitness"), true);
        expect(
          getByRole(container, "list", { name: "Recurring merchants" }),
        ).not.toHaveTextContent("Spotify");
      } else {
        expect(
          queryByRole(container, "list", { name: "Recurring merchants" }),
        ).toBeNull();
      }
    },
  );

  it.each(["{Enter}", " "])(
    "supports native keyboard activation with %j on vendor and view buttons",
    async (key) => {
      const user = userEvent.setup();
      completeResult(analysis("recurring"));
      const netflix = merchant("Netflix");
      act(() => netflix.focus());
      expect(netflix).toHaveFocus();
      await act(async () => user.keyboard(key));
      expectNativeToggle(netflix, false);
      expectTransactions(spotifyIds);
      expect(
        getByRole(container, "region", { name: "Agent details" }),
      ).toBeVisible();
      await act(async () => user.keyboard(key));
      expectNativeToggle(netflix, true);
      expectTransactions(recurringIds);
      await act(async () => user.tab());
      expect(merchant("Spotify")).toHaveFocus();
      await act(async () => user.keyboard(key));
      expectTransactions(netflixIds);
      act(() => viewButton("filtered").focus());
      await act(async () => user.tab());
      expect(viewButton("All transactions")).toHaveFocus();
      await act(async () => user.keyboard(key));
      expectTransactions(allIds);
      expectView(true);
      await act(async () => user.tab({ shift: true }));
      expect(viewButton("filtered")).toHaveFocus();
      await act(async () => user.keyboard(key));
      expectTransactions(netflixIds);
      expectView(false);
      expectNativeToggle(merchant("Spotify"), false);
    },
  );

  function completeResult(result: AnalysisResult) {
    const { onEvent } = eve.useEveAgent.mock.calls.at(-1)?.[0] ?? {};
    expect(onEvent).toBeTypeOf("function");
    act(() => onEvent({ type: "result.completed", data: { result } }));
  }

  function click(element: Element) {
    act(() => fireEvent.click(element));
  }

  function merchant(name: string) {
    return within(
      getByRole(container, "list", { name: "Recurring merchants" }),
    ).getByRole<HTMLButtonElement>("button", { name });
  }

  function viewButton(view: "filtered" | "All transactions") {
    const group = within(
      getByRole(container, "group", { name: "Transaction view" }),
    );
    return view === "filtered"
      ? group.getAllByRole<HTMLButtonElement>("button")[0]
      : group.getByRole<HTMLButtonElement>("button", { name: view });
  }

  function expectNativeToggle(button: HTMLElement, pressed: boolean) {
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("aria-pressed", String(pressed));
    expect(button).toBeEnabled();
  }

  function expectView(showAll: boolean) {
    expectNativeToggle(viewButton("filtered"), !showAll);
    expectNativeToggle(viewButton("All transactions"), showAll);
  }

  function expectTransactions(ids: string[]) {
    const table = getByRole<HTMLTableElement>(container, "table");
    const rows = [...table.tBodies[0].rows];
    const transactionRows = rows.filter((row) => row.cells.length === 5);
    expect(
      transactionRows.map((row) => [
        row.cells[0].textContent,
        row.cells[1].querySelector("span")?.firstChild?.textContent,
        row.cells[2].textContent,
        row.cells[3].textContent,
      ]),
    ).toEqual(
      transactions
        .filter((transaction) => ids.includes(transaction.id))
        .map((transaction) => [
          transaction.date,
          transaction.name,
          transaction.description,
          `$${transaction.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        ]),
    );
    expect(transactionRows).toHaveLength(ids.length);
    if (ids.length === 0) {
      expect(rows).toHaveLength(1);
      expect(rows[0].cells[0]).toHaveAttribute("colspan", "5");
    }
    const count = queryByRole(container, "group", { name: "Transaction view" })
      ? `${ids.length} of 58 transactions`
      : "58 transactions";
    expect(getByText(container, count)).toBeVisible();
  }

  function highlightSnapshot() {
    return [
      ...container.querySelectorAll<HTMLTableRowElement>("tr[data-highlight]"),
    ]
      .map((row) => ({
        id: within(row)
          .getByRole("button")
          .getAttribute("aria-label")
          ?.replace(/^(Show|Hide) reason for /, ""),
        mode: row.dataset.highlight,
        style: row.getAttribute("style"),
        className: row.className,
      }))
      .sort((a, b) => (a.id ?? "").localeCompare(b.id ?? ""));
  }

  function expectHighlights(result: AnalysisResult | null) {
    const expected = buildHighlights(result, transactions);
    const snapshot = highlightSnapshot();
    expect(snapshot.map((row) => row.id)).toEqual([...expected.keys()].sort());
    for (const row of snapshot) expect(row.mode).toBe(result?.mode);
    expect(
      within(getByRole(container, "table")).queryAllByRole("button", {
        name: /^(Show|Hide) reason for /,
      }),
    ).toHaveLength(expected.size);
  }
});
