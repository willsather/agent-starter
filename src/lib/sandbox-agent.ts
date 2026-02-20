import { Sandbox } from "@vercel/sandbox";
import { Output, ToolLoopAgent } from "ai";
import { createBashTool } from "bash-tool";

import { type AnomalyResult, anomalySchema } from "./anomaly";
import { transactionsToCsv } from "./data";

export async function findAnomaliesWithSandbox(): Promise<AnomalyResult> {
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
      output: Output.object({
        schema: anomalySchema,
      }),
      instructions: `You are a transaction anomaly detection agent. Analyze transaction data and identify anomalies.

The transaction data is in CSV format at ./workspace/transactions.csv with columns: id, date, name, description, amount

Use bash commands (awk, grep, sort, etc.) to analyze the data. Look for:
- Unusually large amounts (significantly higher than typical transactions)
- Duplicate transactions (same merchant, amount, and date)
- Suspicious merchant names (ALL CAPS, crypto-related, urgency language)
- Round number wire transfers
- Statistical outliers`,
      tools,
    });

    const { output } = await agent.generate({
      prompt: "Analyze ./workspace/transactions.csv for anomalies.",
    });

    return output;
  } finally {
    console.log(`[sandbox] stopping: ${sandbox.sandboxId}`);
    await sandbox.stop();
    console.log("[sandbox] stopped");
  }
}
