import z from "zod/v4";

export const outfitSchema = z.object({
  top: z.string().describe("The recommended top/shirt item"),
  bottom: z.string().describe("The recommended bottom/pants item"),
  shoes: z.string().describe("The recommended shoes"),
  accessory: z.string().describe("The recommended accessory"),
  reasoning: z.string().describe("Brief explanation for the outfit choice"),
});
export type OutfitRecommendation = z.infer<typeof outfitSchema>;
