import { describe, expect, it } from "vitest";

import {
  type AnalysisResult,
  analysisSchema,
  buildHighlights,
  findRecurringGroups,
  recurringColors,
} from "./analysis";
import type { Transaction } from "./anomaly";
import { transactions as demoTransactions } from "./data";

const transactions: Transaction[] = [
  {
    id: "TXN001",
    date: "2025-01-01",
    name: "Netflix",
    description: "Subscription",
    amount: 15.99,
  },
  {
    id: "TXN002",
    date: "2025-02-01",
    name: " netflix ",
    description: "Subscription renewal",
    amount: 15.99,
  },
  {
    id: "TXN003",
    date: "2025-01-02",
    name: "Spotify",
    description: "Music",
    amount: 10.99,
  },
  {
    id: "TXN004",
    date: "2025-02-02",
    name: "SPOTIFY",
    description: "Music renewal",
    amount: 10.99,
  },
  {
    id: "TXN005",
    date: "2025-01-03",
    name: "Coffee Shop",
    description: "Coffee",
    amount: 5,
  },
];

function charge(
  id: string,
  date: string,
  name = "Netflix",
  amount = 15.99,
): Transaction {
  return { id, date, name, amount, description: "Subscription renewal" };
}

function recurringResult(ids: string[]): AnalysisResult {
  return {
    mode: "recurring",
    matches: ids.map((transaction_id) => ({
      transaction_id,
      reason: "Scheduled renewal.",
    })),
    summary: "Recurring payments.",
  };
}

function result(mode: AnalysisResult["mode"]): AnalysisResult {
  return {
    mode,
    matches: [
      { transaction_id: "TXN001", reason: "Monthly subscription." },
      { transaction_id: "TXN003", reason: "Monthly music payment." },
    ],
    summary: "Two matching merchants.",
  };
}

describe("analysisSchema", () => {
  it.each(["anomalies", "recurring", "search"] as const)(
    "accepts the %s result contract",
    (mode) => {
      const analysis = result(mode);
      expect(analysisSchema.parse(analysis)).toEqual(analysis);
      expect(
        analysisSchema.parse({ mode, matches: [], summary: "No matches." }),
      ).toEqual({ mode, matches: [], summary: "No matches." });
    },
  );

  it.each([
    { matches: [], summary: "Missing mode." },
    { mode: "unknown", matches: [], summary: "Unknown mode." },
    { mode: "anomalies", anomalies: [], summary: "Old contract." },
    {
      mode: "search",
      matches: [{ transaction_id: "TXN001" }],
      summary: "Missing reason.",
    },
    {
      mode: "search",
      matches: [{ transaction_id: 1, reason: "Invalid ID." }],
      summary: "Invalid match.",
    },
    {
      mode: "search",
      matches: [{ transaction_id: "TXN001", reason: 1 }],
      summary: "Invalid reason.",
    },
    { mode: "recurring", matches: null, summary: "Invalid matches." },
    { mode: "search", matches: [] },
    { mode: "search", matches: [], summary: 1 },
  ])("rejects malformed results: %j", (analysis) => {
    expect(analysisSchema.safeParse(analysis).success).toBe(false);
  });
});

describe("findRecurringGroups", () => {
  it("requires at least two unique dated same-price charges for a canonical merchant", () => {
    const data = [
      charge("first", "2025-01-01"),
      charge("second", "2025-01-08", " NETFLIX "),
      charge("other-price", "2025-01-15", "Netflix", 17.99),
      charge("other-merchant", "2025-01-22", "Spotify"),
    ];
    expect(findRecurringGroups(data.toReversed())).toEqual([
      [data[0], data[1]],
    ]);
    expect(findRecurringGroups([])).toEqual([]);
    expect(findRecurringGroups([data[0]])).toEqual([]);
  });

  it.each([
    ["2025-01-01", "2025-01-08", "2025-01-15"],
    ["2025-01-05", "2025-02-04", "2025-03-06"],
    ["2025-01-01", "2025-02-01", "2025-03-01"],
    ["2024-01-15", "2024-02-15", "2024-03-15"],
    ["2024-12-15", "2025-01-15", "2025-02-15"],
  ])(
    "accepts fixed-day or consecutive monthly cadence %j, %j, %j",
    (...dates) => {
      const data = dates.map((date, index) => charge(`charge-${index}`, date));
      expect(findRecurringGroups(data.toReversed())).toEqual([data]);
    },
  );

  it.each([
    ["2025-01-01", "2025-01-08", "2025-01-19"],
    ["2025-01-15", "2025-02-15", "2025-04-15"],
    ["2025-01-15", "2025-02-15", "2025-03-16"],
    ["2025-01-31", "2025-02-28", "2025-03-31"],
  ])(
    "rejects irregular dates %j, %j, %j without picking a valid subset",
    (...dates) => {
      const data = dates.map((date, index) => charge(`charge-${index}`, date));
      expect(findRecurringGroups(data)).toEqual([]);
      expect(
        buildHighlights(
          recurringResult(data.map((transaction) => transaction.id)),
          data,
        ).size,
      ).toBe(0);
    },
  );

  it("drops every charge on a duplicated day, preserving only the remaining valid cadence", () => {
    const data = [
      charge("duplicate1", "2025-01-01"),
      charge("duplicate2", "2025-01-01", " netflix "),
      charge("renewal1", "2025-01-08"),
      charge("renewal2", "2025-01-15"),
      charge("renewal3", "2025-01-22"),
    ];
    expect(findRecurringGroups(data)).toEqual([data.slice(2)]);
    expect(
      buildHighlights(recurringResult(["duplicate1", "duplicate2"]), data).size,
    ).toBe(0);
    expect(
      [...buildHighlights(recurringResult(["renewal1"]), data).keys()].sort(),
    ).toEqual(["renewal1", "renewal2", "renewal3"]);
    expect(findRecurringGroups(data.slice(0, 3))).toEqual([]);
    expect(findRecurringGroups(data.slice(0, 2))).toEqual([]);
  });

  it("ignores invalid and nonexistent calendar dates", () => {
    const data = [
      charge("bad", "not-a-date"),
      charge("february30", "2025-02-30"),
      charge("first", "2025-01-01"),
      charge("second", "2025-02-01"),
      charge("third", "2025-03-01"),
    ];
    expect(findRecurringGroups(data)).toEqual([data.slice(2)]);
    expect(
      buildHighlights(recurringResult(["bad", "february30"]), data).size,
    ).toBe(0);
  });

  it("finds exactly four three-charge demo groups with the required cadence", () => {
    expect(demoTransactions).toHaveLength(58);
    expect(
      new Set(demoTransactions.map((transaction) => transaction.id)).size,
    ).toBe(58);
    const groups = findRecurringGroups(demoTransactions);
    expect(groups).toHaveLength(4);
    expect(groups.map((group) => group[0].name).sort()).toEqual([
      "Netflix",
      "Planet Fitness",
      "Spotify",
      "Verizon",
    ]);
    const expected = new Map([
      ["Netflix", { ids: ["TXN004", "TXN051", "TXN052"], days: 30 }],
      ["Spotify", { ids: ["TXN009", "TXN053", "TXN054"], days: 30 }],
      ["Verizon", { ids: ["TXN016", "TXN055", "TXN056"], days: 30 }],
      ["Planet Fitness", { ids: ["TXN017", "TXN057", "TXN058"], days: 7 }],
    ]);
    for (const group of groups) {
      expect(group).toHaveLength(3);
      expect(group.map((transaction) => transaction.id)).toEqual(
        expected.get(group[0].name)?.ids,
      );
      expect(new Set(group.map((transaction) => transaction.amount)).size).toBe(
        1,
      );
      for (let index = 1; index < group.length; index++) {
        expect(
          (Date.parse(group[index].date) - Date.parse(group[index - 1].date)) /
            86_400_000,
        ).toBe(expected.get(group[0].name)?.days);
      }
    }
    const highlights = buildHighlights(
      recurringResult(demoTransactions.map((transaction) => transaction.id)),
      demoTransactions,
    );
    expect([...highlights.keys()].sort()).toEqual(
      [...expected.values()].flatMap(({ ids }) => ids).sort(),
    );
    expect(
      new Set([...highlights.values()].map((highlight) => highlight.color))
        .size,
    ).toBe(4);
  });
});

describe("buildHighlights", () => {
  it("returns no highlights without a result or transactions", () => {
    expect(buildHighlights(null, transactions).size).toBe(0);
    expect(buildHighlights(result("recurring"), []).size).toBe(0);
  });

  it.each(["anomalies", "recurring", "search"] as const)(
    "returns no highlights for empty %s matches",
    (mode) => {
      expect(
        buildHighlights(
          { mode, matches: [], summary: "No matches." },
          transactions,
        ).size,
      ).toBe(0);
    },
  );

  it.each(["anomalies", "search"] as const)(
    "highlights only exact matching IDs for %s, not every merchant row",
    (mode) => {
      const highlights = buildHighlights(result(mode), transactions);
      expect([...highlights.keys()].sort()).toEqual(["TXN001", "TXN003"]);
      expect(highlights.get("TXN001")).toEqual({
        mode,
        reason: "Monthly subscription.",
        merchant: "Netflix",
        color: expect.any(String),
      });
      expect(highlights.get("TXN003")).toEqual({
        mode,
        reason: "Monthly music payment.",
        merchant: "Spotify",
        color: expect.any(String),
      });
      expect(highlights.has("TXN002")).toBe(false);
      expect(highlights.has("TXN004")).toBe(false);
      expect(highlights.has("TXN005")).toBe(false);
    },
  );

  it("expands selected eligible same-price groups despite merchant case or whitespace", () => {
    const highlights = buildHighlights(result("recurring"), transactions);
    expect([...highlights.keys()].sort()).toEqual([
      "TXN001",
      "TXN002",
      "TXN003",
      "TXN004",
    ]);
    for (const transaction of transactions.slice(0, 4)) {
      const highlight = highlights.get(transaction.id);
      expect(highlight).toEqual({
        mode: "recurring",
        reason:
          transaction.id === "TXN001" || transaction.id === "TXN002"
            ? "Monthly subscription."
            : "Monthly music payment.",
        merchant: transaction.name,
        color: expect.stringMatching(
          /^var\(--ds-(blue|purple|teal|pink)-700\)$/,
        ),
      });
    }
    expect(highlights.get("TXN001")?.color).toBe(
      highlights.get("TXN002")?.color,
    );
    expect(highlights.get("TXN003")?.color).toBe(
      highlights.get("TXN004")?.color,
    );
    expect(highlights.get("TXN001")?.color).not.toBe(
      highlights.get("TXN003")?.color,
    );
    expect(highlights.has("TXN005")).toBe(false);
  });

  it("keeps recurring merchant colors stable across result and transaction order", () => {
    const analysis = result("recurring");
    const original = buildHighlights(analysis, transactions);
    const reordered = buildHighlights(
      { ...analysis, matches: [...analysis.matches].reverse() },
      [...transactions].reverse(),
    );
    for (const transaction of transactions) {
      expect(reordered.get(transaction.id)).toEqual(
        original.get(transaction.id),
      );
    }
    const singleMerchant = buildHighlights(
      { ...analysis, matches: [analysis.matches[1]] },
      transactions,
    );
    expect(singleMerchant.get("TXN003")?.color).toBe(
      original.get("TXN003")?.color,
    );
    expect(singleMerchant.get("TXN004")?.color).toBe(
      original.get("TXN004")?.color,
    );
  });

  it.each(["anomalies", "recurring", "search"] as const)(
    "ignores unknown IDs for %s without changing valid highlights",
    (mode) => {
      const analysis = result(mode);
      const valid = buildHighlights(analysis, transactions);
      const withUnknown = buildHighlights(
        {
          ...analysis,
          matches: [
            { transaction_id: "TXN999", reason: "Unknown merchant." },
            ...analysis.matches,
          ],
        },
        transactions,
      );
      expect(withUnknown).toEqual(valid);
      expect(withUnknown.has("TXN999")).toBe(false);
      expect(
        buildHighlights(
          {
            mode,
            matches: [
              { transaction_id: "TXN999", reason: "Unknown merchant." },
            ],
            summary: "No known matches.",
          },
          transactions,
        ).size,
      ).toBe(0);
    },
  );

  it("expands a recurring merchant even when its reason is empty", () => {
    const highlights = buildHighlights(
      {
        mode: "recurring",
        matches: [{ transaction_id: "TXN001", reason: "" }],
        summary: "Recurring merchant.",
      },
      transactions,
    );
    expect([...highlights.keys()].sort()).toEqual(["TXN001", "TXN002"]);
    expect(highlights.get("TXN002")?.reason).toBe("");
  });

  it("exports the four Geist recurring colors in order", () => {
    expect(recurringColors).toEqual([
      "var(--ds-blue-700)",
      "var(--ds-purple-700)",
      "var(--ds-teal-700)",
      "var(--ds-pink-700)",
    ]);
  });

  it("assigns colors by the sorted eligible merchant set, not selected merchants or unrelated rows", () => {
    const data = [
      charge("z1", "2025-01-01", "Zulu"),
      charge("z2", "2025-01-08", "Zulu"),
      charge("a1", "2025-01-01", "Alpha"),
      charge("a2", "2025-01-08", "Alpha"),
      charge("b1", "2025-01-01", "Beta"),
      charge("b2", "2025-01-08", "Beta"),
      charge("g1", "2025-01-01", "Gamma"),
      charge("g2", "2025-01-08", "Gamma"),
    ];
    const analysis = recurringResult(["z1", "a1", "b1", "g1"]);
    const highlights = buildHighlights(analysis, data);
    expect(highlights.get("a1")?.color).toBe(recurringColors[0]);
    expect(highlights.get("b1")?.color).toBe(recurringColors[1]);
    expect(highlights.get("g1")?.color).toBe(recurringColors[2]);
    expect(highlights.get("z1")?.color).toBe(recurringColors[3]);
    const zuluOnly = buildHighlights(recurringResult(["z2"]), [
      charge("noise", "2025-01-01", "Aardvark"),
      ...data.toReversed(),
    ]);
    expect([...zuluOnly.keys()].sort()).toEqual(["z1", "z2"]);
    expect(zuluOnly.get("z1")?.color).toBe(highlights.get("z1")?.color);
    expect(zuluOnly.get("z2")?.color).toBe(highlights.get("z2")?.color);
  });

  it("does not expand a selection to another same-merchant price group or unrelated charge", () => {
    const data = [
      charge("base1", "2025-01-01"),
      charge("base2", "2025-02-01"),
      charge("premium1", "2025-01-01", "Netflix", 25),
      charge("premium2", "2025-02-01", "Netflix", 25),
      charge("one-off", "2025-01-15", "Netflix", 99),
    ];
    expect(
      [
        ...buildHighlights(recurringResult(["base1", "one-off"]), data).keys(),
      ].sort(),
    ).toEqual(["base1", "base2"]);
    expect(buildHighlights(recurringResult(["one-off"]), data).size).toBe(0);
    expect(
      [...buildHighlights(recurringResult(["premium2"]), data).keys()].sort(),
    ).toEqual(["premium1", "premium2"]);
  });

  it("never highlights model-selected singleton subscriptions or irregular groups", () => {
    const data = [
      charge("single", "2025-01-01", "Hulu"),
      charge("irregular1", "2025-01-01"),
      charge("irregular2", "2025-01-08"),
      charge("irregular3", "2025-01-19"),
    ];
    expect(
      buildHighlights(
        recurringResult(data.map((transaction) => transaction.id)),
        data,
      ).size,
    ).toBe(0);
  });

  it("does not mutate results or transaction data", () => {
    const analysis = result("recurring");
    const originalResult = structuredClone(analysis);
    const originalTransactions = structuredClone(transactions);
    buildHighlights(analysis, transactions);
    expect(analysis).toEqual(originalResult);
    expect(transactions).toEqual(originalTransactions);
  });
});
