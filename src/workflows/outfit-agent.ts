import type { Geo } from "@vercel/functions";
import { generateText, stepCountIs, tool } from "ai";

import { outfitSchema } from "@/lib/outfit";
import { askFriendTool, checkWeatherTool, viewClosetTool } from "@/lib/tools";

export async function outfitAgentWorkflow(geo: Geo) {
  "use workflow";

  return await agentStep(geo);
}

async function agentStep(geo: Geo) {
  "use step";

  const { toolCalls } = await generateText({
    model: "openai/gpt-4.1",
    tools: {
      checkWeather: checkWeatherTool,
      viewCloset: viewClosetTool,
      askFriend: askFriendTool,
      recommendOutfit: tool({
        description:
          "Recommend a complete outfit based on weather, location, and available items",
        inputSchema: outfitSchema,
      }),
    },
    toolChoice: "required",
    stopWhen: stepCountIs(10),
    onStepFinish({ text, toolCalls, toolResults, usage }) {
      console.log("Step Finished", text, toolCalls, toolResults, usage);
    },
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

  7. Once you have gathered information and made your decision, use the recommendOutfit tool to provide structured outfit recommendation results.

  Provide a detailed recommendation with specific clothing items and explain your reasoning.`,
      },
      {
        role: "user",
        content: `I need an outfit recommendation for today in ${geo.city} located at: ${geo.latitude}.${geo.longitude}. Please help me choose what to wear. Use the recommendOutfit tool to provide structured results after gathering the necessary information.`,
      },
    ],
  });

  const outfitToolCall = toolCalls.find(
    (tool) => tool.toolName === "recommendOutfit",
  );

  if (!outfitToolCall) {
    throw new Error("No outfit recommendation results found");
  }

  return outfitSchema.parse(outfitToolCall.input);
}
