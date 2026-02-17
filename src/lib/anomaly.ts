import { z } from "zod";

export type Transaction = {
  id: string;
  date: string;
  name: string;
  description: string;
  amount: number;
};

export type Anomaly = {
  transaction_id: string;
  reason: string;
};

export type AnomalyResult = {
  anomalies: Anomaly[];
  summary: string;
};

export const anomalySchema = z.object({
  anomalies: z.array(
    z.object({
      transaction_id: z.string(),
      reason: z.string(),
    })
  ),
  summary: z.string(),
});
