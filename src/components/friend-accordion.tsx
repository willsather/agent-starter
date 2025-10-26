"use client";

import { useState } from "react";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getFriendAdvice } from "@/lib/friend";

export function FriendAccordion() {
  const [friendResult, setFriendResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    if (loading) return;

    setLoading(true);
    setFriendResult("");

    try {
      // artificial delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      const advice = getFriendAdvice("What should I wear today?");
      setFriendResult(advice.response);
    } catch (error) {
      console.error("Error getting friend advice:", error);
      setFriendResult("Your friend is unavailable right now");
    } finally {
      setLoading(false);
    }
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
        <div className="rounded border border-white/20 bg-black/20 p-4">
          {loading ? (
            <div className="space-y-2">
              <div className="h-4 animate-pulse rounded bg-white/10" />
            </div>
          ) : friendResult ? (
            <pre className="whitespace-pre-wrap font-mono text-gray-300 text-sm">
              {friendResult}
            </pre>
          ) : (
            <div className="font-mono text-gray-500 text-sm">
              Click to ask your friend for advice...
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
