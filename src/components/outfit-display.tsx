"use client";

import { useState } from "react";

import type { OutfitRecommendation } from "@/lib/outfit";

export function OutfitDisplay() {
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
    <>
      {/* CTA Button */}
      <div className="mb-12 flex justify-center">
        <button
          type="button"
          onClick={fetchOutfit}
          disabled={loading}
          className="rounded-lg border border-white/20 bg-white/5 px-8 py-4 font-medium font-mono text-lg text-white backdrop-blur-sm transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? status || "Getting your outfit..." : "Get My Outfit"}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-8 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-center text-red-400">
          {error}
        </div>
      )}
      {/* Outfit Grid */}
      <div className="mb-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Top */}
          <div className="flex min-h-[180px] flex-col justify-center rounded-lg border border-purple-500/30 bg-purple-500/5 p-8 backdrop-blur-sm">
            <div className="mb-3 font-mono text-purple-400 text-sm uppercase tracking-wider">
              Top
            </div>
            <div className="font-mono text-white text-xl">
              {loading ? (
                <div className="h-8 animate-pulse rounded bg-white/10" />
              ) : outfit ? (
                outfit.top
              ) : (
                "—"
              )}
            </div>
          </div>

          {/* Bottom */}
          <div className="flex min-h-[180px] flex-col justify-center rounded-lg border border-blue-500/30 bg-blue-500/5 p-8 backdrop-blur-sm">
            <div className="mb-3 font-mono text-blue-400 text-sm uppercase tracking-wider">
              Bottom
            </div>
            <div className="font-mono text-white text-xl">
              {loading ? (
                <div className="h-8 animate-pulse rounded bg-white/10" />
              ) : outfit ? (
                outfit.bottom
              ) : (
                "—"
              )}
            </div>
          </div>

          {/* Shoes */}
          <div className="flex min-h-[180px] flex-col justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-8 backdrop-blur-sm">
            <div className="mb-3 font-mono text-cyan-400 text-sm uppercase tracking-wider">
              Shoes
            </div>
            <div className="font-mono text-white text-xl">
              {loading ? (
                <div className="h-8 animate-pulse rounded bg-white/10" />
              ) : outfit ? (
                outfit.shoes
              ) : (
                "—"
              )}
            </div>
          </div>

          {/* Accessory */}
          <div className="flex min-h-[180px] flex-col justify-center rounded-lg border border-pink-500/30 bg-pink-500/5 p-8 backdrop-blur-sm">
            <div className="mb-3 font-mono text-pink-400 text-sm uppercase tracking-wider">
              Accessory
            </div>
            <div className="font-mono text-white text-xl">
              {loading ? (
                <div className="h-8 animate-pulse rounded bg-white/10" />
              ) : outfit ? (
                outfit.accessory
              ) : (
                "—"
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Reasoning */}
      {outfit?.reasoning && (
        <div className="mb-12 rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-3 font-mono font-semibold text-gray-400 text-sm uppercase tracking-wider">
            Why this outfit?
          </div>
          <div className="text-gray-300 leading-relaxed">
            {outfit.reasoning}
          </div>
        </div>
      )}
    </>
  );
}
