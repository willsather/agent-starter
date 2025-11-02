import type { Geo } from "@vercel/functions";
import { Output, ToolLoopAgent } from "ai";

import { outfitSchema } from "@/lib/outfit";
import { askFriendTool, checkWeatherTool, viewClosetTool } from "@/lib/tools";

export async function outfitAgentWorkflow(geo: Geo) {
  "use workflow";

  return await agentStep(geo);
}

async function agentStep(geo: Geo) {
  "use step";

  const agent = new ToolLoopAgent({
    model: "openai/gpt-5-nano",
    tools: {
      checkWeather: checkWeatherTool,
      viewCloset: viewClosetTool,
      askFriend: askFriendTool,
    },
    output: Output.object({
      schema: outfitSchema,
    }),
    instructions: `You are a fashion advisor AI agent. Your job is to recommend complete outfits based on the location, weather, and available clothing items.

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
  });

  const { output } = await agent.generate({
    prompt: `I need an outfit recommendation for today in ${geo.city} located at: ${geo.latitude}.${geo.longitude}. Please help me choose what to wear by gathering the necessary information and providing structured results.`,
  });

  return output;
}
