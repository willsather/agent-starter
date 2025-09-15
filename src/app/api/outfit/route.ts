import { agent } from "@/lib/agent";
import { geolocation } from "@vercel/functions";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { city } = geolocation(request);

    const result = await agent(city);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in outfit recommendation:", error);

    return NextResponse.json(
      { error: "Failed to generate outfit recommendation" },
      { status: 500 },
    );
  }
}
