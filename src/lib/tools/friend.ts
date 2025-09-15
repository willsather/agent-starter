import { tool } from "ai";
import { z } from "zod";

export const askFriendTool = tool({
  description: "Ask a friend for outfit advice",
  inputSchema: z.object({
    question: z.string().describe("The question to ask the friend"),
  }),
  execute: async ({ question }) => {
    const friendResponses = [
      "Go with something casual and comfortable!",
      "You should definitely dress up a bit today.",
      "Layer up, it might get chilly later.",
      "Bright colors always look good on you!",
      "Keep it simple - less is more.",
      "Don't forget to accessorize!",
    ];
    const response =
      friendResponses[Math.floor(Math.random() * friendResponses.length)];

    return `Friend's advice about "${question}": ${response}`;
  },
});
