import { afterEach, expect, it, vi } from "vitest";

import getTransactions from "../agent/tools/get-transactions";
import { transactions } from "../src/lib/data";

afterEach(() => vi.useRealTimers());

it("returns the actual current UTC date alongside the sample transactions", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-07T00:30:00Z"));

  const result = await getTransactions.execute?.({}, undefined as never);

  expect(result).toMatchObject({
    today: "2026-10-07",
    timeZone: "UTC",
    count: 58,
    transactions,
  });
  if (!result || !("transactions" in result)) {
    throw new Error("Expected a transaction dataset response");
  }
  expect(result.transactions).toHaveLength(58);
  expect(result.count).toBe(result.transactions.length);
  expect(result.recurringGroups).toHaveLength(4);
});
