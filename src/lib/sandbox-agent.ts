import { Sandbox } from "@vercel/sandbox";
import { ToolLoopAgent } from "ai";
import { createBashTool } from "bash-tool";
import { z } from "zod";

import type { AnomalyResult } from "./anomaly";
import { transactionsToCsv } from "./data";

const finalizeSchema = z.object({
  anomalies: z.array(
    z.object({
      transaction_id: z.string(),
      reason: z.string(),
    }),
  ),
  summary: z.string(),
});

export async function createSandboxAnomalyAgent(): Promise<AnomalyResult> {
  let result: AnomalyResult | null = null;

  console.log("[sandbox] creating...");
  const sandbox = await Sandbox.create({ timeout: 60_000 });
  console.log(`[sandbox] created: ${sandbox.sandboxId}`);

  const { tools } = await createBashTool({
    sandbox,
    files: {
      "transactions.csv": transactionsToCsv(),
    },
    onBeforeBashCall: ({ command }) => {
      console.log(`[bash] executing: ${command}`);
      return { command };
    },
    onAfterBashCall: ({ command, result }) => {
      console.log(`[bash] completed: ${command} (exit: ${result.exitCode})`);
      if (result.stdout)
        console.log(`[bash] stdout: ${result.stdout.slice(0, 500)}`);
      if (result.stderr)
        console.log(`[bash] stderr: ${result.stderr.slice(0, 500)}`);
      return { result };
    },
  });

  try {
    const agent = new ToolLoopAgent({
      model: "anthropic/claude-haiku-4.5",
      instructions: `You are a transaction anomaly detection agent. Analyze transaction data and identify anomalies.

The transaction data is in CSV format at ./workspace/transactions.csv with columns: id, date, name, description, amount

Use bash commands (awk, grep, sort, etc.) to analyze the data. Look for:
- Unusually large amounts (significantly higher than typical transactions)
- Duplicate transactions (same merchant, amount, and date)
- Suspicious merchant names (ALL CAPS, crypto-related, urgency language)
- Round number wire transfers
- Statistical outliers

After analysis, call the finalize tool with your findings.`,
      tools: {
        ...tools,
        finalize: {
          description: "Submit the final anomaly detection results",
          inputSchema: finalizeSchema,
          execute: async (params: z.infer<typeof finalizeSchema>) => {
            result = params;
            return "Results submitted successfully";
          },
        },
      },
    });

    await agent.generate({
      prompt:
        "Analyze ./workspace/transactions.csv for anomalies and call finalize with your findings.",
    });

    if (!result) {
      throw new Error("Agent did not produce results");
    }

    return result;
  } finally {
    console.log(`[sandbox] stopping: ${sandbox.sandboxId}`);
    await sandbox.stop();
    console.log("[sandbox] stopped");
  }
}
