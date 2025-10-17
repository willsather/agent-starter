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
      {/* Header */}
      <div className="mb-16 text-center">
        <h1 className="mb-4 font-bold font-mono text-5xl tracking-tight">
          Outfit Agent
        </h1>
        <p className="text-gray-400 text-lg">
          Get AI-powered outfit recommendations tailored for you
        </p>
        <a
          href="https://github.com/willsather/agent-starter"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-gray-500 text-sm transition-colors hover:text-gray-300"
        >
          <svg
            className="h-4 w-4"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              clipRule="evenodd"
            />
          </svg>
          <p>view source{" ->"}</p>
        </a>
      </div>

      {/* CTA Button */}
      <div className="mb-12 flex justify-center">
        <button
          type="button"
          onClick={fetchOutfit}
          disabled={loading}
          className="rounded-lg border border-white/20 bg-white/5 px-8 py-4 font-medium font-mono text-lg text-white backdrop-blur-sm transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Getting your outfit..." : "Get My Outfit"}
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
