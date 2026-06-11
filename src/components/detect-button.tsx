"use client";

import { AlertTriangle, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type DetectButtonProps = {
  onDetect: () => void;
  loading: boolean;
  disabled?: boolean;
};

export function DetectButton({
  onDetect,
  loading,
  disabled,
}: DetectButtonProps) {
  return (
    <button
      type="button"
      onClick={onDetect}
      disabled={loading || disabled}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-sm transition-colors",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing...
        </>
      ) : (
        <>
          <AlertTriangle className="h-4 w-4 text-red-400" />
          Detect Anomalies
        </>
      )}
    </button>
  );
}
