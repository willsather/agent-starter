import { tool } from "ai";
import { z } from "zod";

export const viewClosetTool = tool({
  description: "View available clothing items in the closet",
  inputSchema: z.object({}),
  execute: async () => {
    const mockCloset = {
      tops: [
        "white t-shirt",
        "blue button-down",
        "gray sweater",
        "black hoodie",
        "striped polo",
      ],
      bottoms: ["jeans", "khakis", "black dress pants", "shorts", "leggings"],
      shoes: ["sneakers", "dress shoes", "boots", "sandals"],
      outerwear: ["light jacket", "winter coat", "rain jacket", "blazer"],
      accessories: ["watch", "sunglasses", "scarf", "baseball cap"],
    };

    return `Available clothing:\nTops: ${mockCloset.tops.join(", ")}\nBottoms: ${mockCloset.bottoms.join(", ")}\nShoes: ${mockCloset.shoes.join(", ")}\nOuterwear: ${mockCloset.outerwear.join(", ")}\nAccessories: ${mockCloset.accessories.join(", ")}`;
  },
});
