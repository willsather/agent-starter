import { tool } from "ai";
import { z } from "zod";

import { formatWeatherDisplay, getWeatherData } from "@/lib/weather";

export const checkWeatherTool = tool({
  description: "Check the current weather conditions for a specific location",
  inputSchema: z.object({
    longitude: z
      .string()
      .describe("The Longitude of the user to check weather for"),
    latitude: z
      .string()
      .describe("The Latitude for the user to check weather for"),
  }),
  execute: async ({ latitude, longitude }) => {
    const weather = await getWeatherData(latitude, longitude);
    return formatWeatherDisplay(weather);
  },
});
