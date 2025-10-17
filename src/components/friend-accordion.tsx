"use client";

import { useState } from "react";
import { 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { getFriendAdvice } from "@/lib/friend";

export function FriendAccordion() {
  const [friendResult, setFriendResult] = useState<string>("");

  const handleOpen = () => {
    if (friendResult) return; // Don't fetch again if already loaded
    const advice = getFriendAdvice("What should I wear today?");
    setFriendResult(advice.response);
  };

  return (
    <AccordionItem value="friend" className="border-white/10">
      <AccordionTrigger 
        className="font-mono text-white hover:text-gray-300"
        onClick={handleOpen}
      >
        Ask a Friend
      </AccordionTrigger>
      <AccordionContent className="space-y-4">
        {friendResult && (
          <div className="rounded border border-white/20 bg-black/20 p-4">
            <pre className="whitespace-pre-wrap font-mono text-gray-300 text-sm">
              {friendResult}
            </pre>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}