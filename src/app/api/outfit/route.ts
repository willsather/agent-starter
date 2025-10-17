import { geolocation } from "@vercel/functions";
import { generateObject, generateText, stepCountIs } from "ai";
import { type NextRequest, NextResponse } from "next/server";

import { outfitSchema } from "@/lib/outfit";
import { askFriendTool, checkWeatherTool, viewClosetTool } from "@/lib/tools";

export async function POST(request: NextRequest) {
  try {
    const { city, latitude, longitude } = geolocation(request);

    // Step 1: Use the agent to gather information and make recommendation
    const agentResult = await generateText({
      model: "openai/gpt-4.1",
      messages: [
        {
          role: "system",
          content: `You are a fashion advisor AI agent. Your job is to recommend complete outfits based on the location, weather, and available clothing items.

Guidelines:
1. Always check the weather first for the given location
2. Look at what's available in the closet
3. You may ask a friend for advice if needed
4. Provide a complete outfit recommendation with specific items for each category
5. Explain your reasoning briefly
6. Recommend versatile outfits suitable for general daily activities

Be practical, stylish, and considerate of weather conditions.

If you don't know the weather, then use your best judgment.

Provide a detailed recommendation with specific clothing items and explain your reasoning.`,
        },
        {
          role: "user",
          content: `I need an outfit recommendation for today in ${city} located at: ${latitude}.${longitude}. Please help me choose what to wear.`,
        },
      ],
      stopWhen: stepCountIs(5),
      tools: {
        checkWeather: checkWeatherTool,
        viewCloset: viewClosetTool,
        askFriend: askFriendTool,
      },
    });

    // Step 2: Extract structured data from the agent's recommendation
    const structuredResult = await generateObject({
      model: "openai/gpt-4.1",
      schema: outfitSchema,
      messages: [
        {
          role: "system",
          content: `You are a data extraction assistant. Extract the outfit recommendation details from the given text and format them into the required structure.

Extract:
- top: the specific top/shirt item mentioned
- bottom: the specific bottom/pants item mentioned  
- shoes: the specific shoes mentioned
- accessory: the specific accessory mentioned
- reasoning: the explanation for why this outfit was chosen

Be precise and extract the exact items mentioned in the recommendation.`,
        },
        {
          role: "user",
          content: `Please extract the outfit details from this recommendation:\n\n${agentResult.text}`,
        },
      ],
    });

    return NextResponse.json(structuredResult.object);
  } catch (error) {
    console.error("Error in outfit recommendation:", error);

    return NextResponse.json(
      { error: "Failed to generate outfit recommendation" },
      { status: 500 },
    );
  }
}
