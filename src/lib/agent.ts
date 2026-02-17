import { ToolLoopAgent } from "ai";
import { z } from "zod";
import { type AnomalyResult } from "./anomaly";
import { transactions, transactionsToCsv } from "./data";

const finalizeSchema = z.object({
  anomalies: z.array(
    z.object({
      transaction_id: z.string(),
      reason: z.string(),
    })
  ),
  summary: z.string(),
});

const getTransactionsSchema = z.object({
  format: z.enum(["json", "csv"]).describe("Format to return transactions in"),
});

export async function createAnomalyAgent(): Promise<AnomalyResult> {
  let result: AnomalyResult | null = null;

  console.log("[agent] starting simple anomaly detection");

  const agent = new ToolLoopAgent({
    model: "anthropic/claude-haiku-4.5",
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
        description: "Retrieve all transactions in JSON or CSV format",
        inputSchema: getTransactionsSchema,
        execute: async ({ format }: z.infer<typeof getTransactionsSchema>) => {
          console.log(`[tool] getTransactions (format: ${format})`);
          if (format === "csv") {
            return transactionsToCsv();
          }
          return JSON.stringify(transactions, null, 2);
        },
      },
      finalize: {
        description: "Submit the final anomaly detection results",
        inputSchema: finalizeSchema,
        execute: async (params: z.infer<typeof finalizeSchema>) => {
          console.log(`[tool] finalize (${params.anomalies.length} anomalies)`);
          result = params;
          return "Results submitted successfully";
        },
      },
    },
  });

  await agent.generate({
    prompt: "Retrieve the transactions and analyze them for anomalies, then call finalize with your findings.",
  });

  console.log("[agent] completed");

  if (!result) {
    throw new Error("Agent did not produce results");
  }

  return result;
}
