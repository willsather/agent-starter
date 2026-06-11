import { tool } from "ai";
import { z } from "zod";

import { transactions } from "@/lib/data";

export default tool({
  description:
    "Get the full list of transactions to analyze, including id, date, name, description, and amount for each.",
  inputSchema: z.object({}),
  execute: async () => {
    return { count: transactions.length, transactions };
  },
});
