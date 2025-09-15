import { generateText, stepCountIs } from "ai";
import { askFriendTool, checkWeatherTool, viewClosetTool } from "./tools";

export const agent = (city?: string) =>
  generateText({
    model: "openai/gpt-4",
    messages: [
      {
        role: "system",
        content: `You are a fashion advisor AI agent. Your job is to recommend complete outfits based on the location, weather, and available clothing items.

Guidelines:
1. Always check the weather first for the given location
2. Look at what's available in the closet
3. You may ask a friend for advice if needed
4. Provide a complete outfit recommendation including specific items
5. Explain your reasoning briefly
6. Recommend versatile outfits suitable for general daily activities

Be practical, stylish, and considerate of weather conditions.`,
      },
      {
        role: "user",
        content: `I need an outfit recommendation for today in ${city}. Please help me choose what to wear.`,
      },
    ],
    stopWhen: stepCountIs(5),
    tools: {
      checkWeather: checkWeatherTool,
      viewCloset: viewClosetTool,
      askFriend: askFriendTool,
    },
  });
