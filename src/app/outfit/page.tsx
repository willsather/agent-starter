"use client";

import type { OutfitRecommendation } from "@/app/api/outfit/route";
import { useState } from "react";

export default function OutfitPage() {
  const [outfit, setOutfit] = useState<OutfitRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOutfit = async () => {
    setLoading(true);
    setError(null);
    setOutfit(null);

    try {
      const response = await fetch("/api/outfit", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to get outfit recommendation");
      }

      const data = await response.json();
      setOutfit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden p-6">
      <div className="absolute inset-0">
        <div className="-z-10 absolute inset-0 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-white [background-size:16px_16px]" />
      </div>

      <div className="relative z-20 flex flex-col items-center justify-center text-center">
        <button
          type="button"
          onClick={fetchOutfit}
          disabled={loading}
          className="mb-8 inline-flex items-center justify-center rounded-md bg-gray-900 px-6 py-3 font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Getting your outfit..." : "Get My Outfit"}
        </button>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="w-full max-w-2xl">
          <div className="grid grid-cols-2 gap-6">
            {/* Top */}
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-10 text-center min-h-[150px] flex flex-col justify-center">
              <div className="mb-4 font-semibold text-gray-500 text-base uppercase tracking-wide">
                Top
              </div>
              <div className="font-medium text-gray-900 text-xl">
                {loading ? (
                  <div className="h-8 animate-pulse rounded bg-gray-200" />
                ) : outfit ? (
                  outfit.top
                ) : (
                  "—"
                )}
              </div>
            </div>

            {/* Bottom */}
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-10 text-center min-h-[150px] flex flex-col justify-center">
              <div className="mb-4 font-semibold text-gray-500 text-base uppercase tracking-wide">
                Bottom
              </div>
              <div className="font-medium text-gray-900 text-xl">
                {loading ? (
                  <div className="h-8 animate-pulse rounded bg-gray-200" />
                ) : outfit ? (
                  outfit.bottom
                ) : (
                  "—"
                )}
              </div>
            </div>

            {/* Shoes */}
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-10 text-center min-h-[150px] flex flex-col justify-center">
              <div className="mb-4 font-semibold text-gray-500 text-base uppercase tracking-wide">
                Shoes
              </div>
              <div className="font-medium text-gray-900 text-xl">
                {loading ? (
                  <div className="h-8 animate-pulse rounded bg-gray-200" />
                ) : outfit ? (
                  outfit.shoes
                ) : (
                  "—"
                )}
              </div>
            </div>

            {/* Accessory */}
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-10 text-center min-h-[150px] flex flex-col justify-center">
              <div className="mb-4 font-semibold text-gray-500 text-base uppercase tracking-wide">
                Accessory
              </div>
              <div className="font-medium text-gray-900 text-xl">
                {loading ? (
                  <div className="h-8 animate-pulse rounded bg-gray-200" />
                ) : outfit ? (
                  outfit.accessory
                ) : (
                  "—"
                )}
              </div>
            </div>
          </div>

          {outfit?.reasoning && (
            <div className="mt-6 rounded-lg bg-gray-50 p-4">
              <div className="mb-2 font-semibold text-gray-700 text-sm">
                Why this outfit?
              </div>
              <div className="text-gray-600">{outfit.reasoning}</div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
