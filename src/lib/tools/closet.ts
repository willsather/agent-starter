import { tool } from "ai";
import { z } from "zod/v4";

import { formatClosetDisplay, getClosetItems } from "@/lib/closet";

export const viewClosetTool = tool({
  description: "View available clothing items in the closet",
  inputSchema: z.object({}),
  execute: async () => {
    const closet = getClosetItems();
    return formatClosetDisplay(closet);
  },
});
