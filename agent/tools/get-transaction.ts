import { tool } from "ai";
import { z } from "zod";

import { transactions } from "@/lib/data";

export default tool({
  description:
    "Get the full details of a single transaction by its id, plus dataset context (median and max amount) to help judge whether it is anomalous.",
  inputSchema: z.object({
    id: z.string().describe("The transaction id, e.g. TXN011"),
  }),
  execute: async ({ id }) => {
    const transaction = transactions.find((t) => t.id === id);
    if (!transaction) return { error: `no transaction found with id ${id}` };

    const amounts = transactions.map((t) => t.amount).sort((a, b) => a - b);
    const median = amounts[Math.floor(amounts.length / 2)];
    const max = amounts[amounts.length - 1];

    const duplicates = transactions.filter(
      (t) =>
        t.id !== id &&
        t.name === transaction.name &&
        t.amount === transaction.amount &&
        t.date === transaction.date,
    );

    return {
      transaction,
      context: {
        median,
        max,
        duplicateIds: duplicates.map((d) => d.id),
      },
    };
  },
});
