import { tool } from "ai";
import { z } from "zod";

export const checkWeatherTool = tool({
  description: "Check the current weather conditions",
  inputSchema: z.object({
    location: z.string().describe("The location to check weather for"),
  }),
  execute: async ({ location }) => {
    const mockWeather = {
      temperature: Math.floor(Math.random() * 40) + 10,
      condition: ["sunny", "cloudy", "rainy", "snowy"][
        Math.floor(Math.random() * 4)
      ],
      humidity: Math.floor(Math.random() * 100),
      windSpeed: Math.floor(Math.random() * 20),
    };
    return `Weather in ${location}: ${mockWeather.temperature}°F, ${mockWeather.condition}, ${mockWeather.humidity}% humidity, ${mockWeather.windSpeed} mph wind`;
  },
});
