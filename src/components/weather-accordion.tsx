"use client";

import { useState } from "react";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import type { Geolocation } from "@/lib/geolocation";
import { formatWeatherDisplay, getWeatherData } from "@/lib/weather";

export function WeatherAccordion({
  geolocation,
}: {
  geolocation: Geolocation;
}) {
  const [weatherResult, setWeatherResult] = useState<string>("");

  const handleOpen = async () => {
    if (weatherResult) return;

    try {
      const weather = await getWeatherData(
        geolocation.latitude,
        geolocation.longitude,
      );
      setWeatherResult(formatWeatherDisplay(weather));
    } catch (error) {
      console.error("Error fetching weather data:", error);
      setWeatherResult("Failed to fetch weather data");
    }
  };

  return (
    <AccordionItem value="weather" className="border-white/10">
      <AccordionTrigger
        className="font-mono text-white hover:text-gray-300"
        onClick={handleOpen}
      >
        Get Weather
      </AccordionTrigger>
      <AccordionContent className="space-y-4">
        {weatherResult && (
          <>
            <div className="font-mono text-gray-400 text-sm">
              {geolocation.city} ({geolocation.latitude},{" "}
              {geolocation.longitude})
            </div>
            <div className="rounded border border-white/20 bg-black/20 p-4">
              <pre className="whitespace-pre-wrap font-mono text-gray-300 text-sm">
                {weatherResult}
              </pre>
            </div>
          </>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
