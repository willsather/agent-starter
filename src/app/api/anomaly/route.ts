import { findAnomalies } from "@/lib/agent";

export const maxDuration = 60;

export async function POST() {
  try {
    const result = await findAnomalies();
    return Response.json(result);
  } catch (error) {
    console.error("Anomaly detection failed:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
