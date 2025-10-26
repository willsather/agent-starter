import { geolocation } from "@vercel/functions";
import { type NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";

import { outfitAgentWorkflow } from "@/workflows/outfit-agent";

export async function POST(request: NextRequest) {
  try {
    const geo = geolocation(request);

    const run = await start(outfitAgentWorkflow, [geo]);

    // wait for the workflow to complete
    const outfit = await run.returnValue;

    return Response.json(outfit);
  } catch (error) {
    console.error("Error in /api/outfit:", error);

    return NextResponse.json(
      { error: "Failed to generate outfit recommendation" },
      { status: 500 },
    );
  }
}
