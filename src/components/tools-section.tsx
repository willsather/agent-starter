import { Accordion } from "@/components/ui/accordion";
import { getLocation } from "@/lib/geolocation";

import { ClosetAccordion } from "./closet-accordion";
import { FriendAccordion } from "./friend-accordion";
import { WeatherAccordion } from "./weather-accordion";

export async function ToolsSection() {
  const geolocation = await getLocation();

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm">
      <div className="p-6 pb-4">
        <div className="mb-4 font-mono font-semibold text-gray-400 text-sm uppercase tracking-wider">
          Outfit Tools
        </div>
      </div>

      <Accordion type="single" collapsible className="px-6 pb-6">
        <ClosetAccordion />
        <FriendAccordion />
        <WeatherAccordion geolocation={geolocation} />
      </Accordion>
    </div>
  );
}
