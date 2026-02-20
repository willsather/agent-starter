import { Output, ToolLoopAgent } from "ai";
import { z } from "zod";
import { type AnomalyResult } from "./anomaly";
import { transactions } from "./data";

const anomalyResultSchema = z.object({
  anomalies: z.array(
    z.object({
      transaction_id: z.string(),
      reason: z.string(),
    }),
  ),
  summary: z.string(),
});

export async function createAnomalyAgent(): Promise<AnomalyResult> {
  const agent = new ToolLoopAgent({
    model: "anthropic/claude-haiku-4.5",
    output: Output.object({
      schema: anomalyResultSchema,
    }),
    instructions: `You are a transaction anomaly detection agent. Analyze transaction data and identify anomalies.

Use the getTransactions tool to retrieve transaction data, then analyze it for anomalies.

Look for:
- Unusually large amounts (significantly higher than typical transactions)
- Duplicate transactions (same merchant, amount, and date)
- Suspicious merchant names (ALL CAPS, crypto-related, urgency language)
- Round number wire transfers
- Statistical outliers

After analysis, call the finalize tool with your findings.`,
    tools: {
      getTransactions: {
        description:
          "Fetch all financial transactions from the database. Call this tool first to get transaction data before analyzing for anomalies.",
        inputSchema: z.object({}),
        execute: () => {
          console.log("[agent] fetched transactions");

          return transactions;
        },
      },
    },
    onFinish: async () => {
      console.log("[agent] completed");
    },
  });

  console.log("[agent] starting simple anomaly detection");

  const { output } = await agent.generate({
    prompt:
      "Retrieve the transactions and analyze them for anomalies, then call finalize with your findings.",
  });

  return output;
}
