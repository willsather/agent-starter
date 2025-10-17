import { tool } from "ai";
import { z } from "zod";
import { getClosetItems, formatClosetDisplay } from "@/lib/closet";

export const viewClosetTool = tool({
  description: "View available clothing items in the closet",
  inputSchema: z.object({}),
  execute: async () => {
    const closet = getClosetItems();
    return formatClosetDisplay(closet);
  },
});
