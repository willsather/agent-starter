"use client";

import { useState } from "react";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { type ClosetItem, getClosetItems } from "@/lib/closet";

export function ClosetAccordion() {
  const [closetData, setClosetData] = useState<ClosetItem | null>(null);

  const handleOpen = () => {
    if (closetData) return;
    const closet = getClosetItems();
    setClosetData(closet);
  };

  return (
    <AccordionItem value="closet" className="border-white/10">
      <AccordionTrigger
        className="font-mono text-white hover:text-gray-300"
        onClick={handleOpen}
      >
        View My Closet
      </AccordionTrigger>
      <AccordionContent className="space-y-4">
        {closetData && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded border border-purple-500/30 bg-purple-500/10 p-4">
              <h4 className="mb-2 font-mono font-semibold text-purple-400 text-sm uppercase tracking-wider">
                Tops
              </h4>
              <ul className="space-y-1">
                {closetData.tops.map((item) => (
                  <li key={item} className="font-mono text-gray-300 text-sm">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded border border-blue-500/30 bg-blue-500/10 p-4">
              <h4 className="mb-2 font-mono font-semibold text-blue-400 text-sm uppercase tracking-wider">
                Bottoms
              </h4>
              <ul className="space-y-1">
                {closetData.bottoms.map((item) => (
                  <li key={item} className="font-mono text-gray-300 text-sm">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded border border-cyan-500/30 bg-cyan-500/10 p-4">
              <h4 className="mb-2 font-mono font-semibold text-cyan-400 text-sm uppercase tracking-wider">
                Shoes
              </h4>
              <ul className="space-y-1">
                {closetData.shoes.map((item) => (
                  <li key={item} className="font-mono text-gray-300 text-sm">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded border border-orange-500/30 bg-orange-500/10 p-4">
              <h4 className="mb-2 font-mono font-semibold text-orange-400 text-sm uppercase tracking-wider">
                Outerwear
              </h4>
              <ul className="space-y-1">
                {closetData.outerwear.map((item) => (
                  <li key={item} className="font-mono text-gray-300 text-sm">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded border border-pink-500/30 bg-pink-500/10 p-4">
              <h4 className="mb-2 font-mono font-semibold text-pink-400 text-sm uppercase tracking-wider">
                Accessories
              </h4>
              <ul className="space-y-1">
                {closetData.accessories.map((item) => (
                  <li key={item} className="font-mono text-gray-300 text-sm">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
