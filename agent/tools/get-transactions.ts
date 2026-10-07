import { defineTool } from "eve/tools";
import { z } from "zod";

import { findRecurringGroups } from "@/lib/analysis";
import { transactions } from "@/lib/data";

export default defineTool({
  description:
    "Get all transactions with their ids, dates, merchants, descriptions, and amounts, plus today's UTC date and verified recurring groups. Compare transaction dates with the returned today value for current-day searches.",
  inputSchema: z.object({}),
  execute: async () => {
    return {
      today: new Date().toISOString().slice(0, 10),
      timeZone: "UTC",
      count: transactions.length,
      transactions,
      recurringGroups: findRecurringGroups(transactions).map((group) => ({
        merchant: group[0].name,
        amount: group[0].amount,
        transactionIds: group.map((transaction) => transaction.id),
        dates: group.map((transaction) => transaction.date),
      })),
    };
  },
});
