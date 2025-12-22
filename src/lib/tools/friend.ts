import { tool } from "ai";
import { z } from "zod/v4";

import { formatFriendAdvice, getFriendAdvice } from "@/lib/friend";

export const askFriendTool = tool({
  description: "Ask a friend for outfit advice",
  inputSchema: z.object({
    question: z.string().describe("The question to ask the friend"),
  }),
  execute: async ({ question }) => {
    const advice = getFriendAdvice(question);
    return formatFriendAdvice(advice);
  },
});
