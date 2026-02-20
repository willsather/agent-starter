"use client";

import {
  AlertTriangle,
  ChevronDown,
  Hammer,
  Loader2,
  Terminal,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type DetectButtonProps = {
  onDetect: (useSandbox: boolean) => void;
  loading: boolean;
  disabled?: boolean;
};

export function DetectButton({
  onDetect,
  loading,
  disabled,
}: DetectButtonProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex">
        <button
          type="button"
          onClick={() => onDetect(false)}
          disabled={loading || disabled}
          className={cn(
            "inline-flex items-center gap-2 rounded-l-lg px-4 py-2 font-medium text-sm transition-colors",
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
        <button
          type="button"
          onClick={() => setOpen(!open)}
          disabled={loading || disabled}
          className={cn(
            "inline-flex items-center rounded-r-lg border-primary-foreground/20 border-l px-2 py-2 transition-colors",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      {open && (
        <div className="absolute right-0 z-10 mt-1 w-72 rounded-lg border border-border bg-card shadow-lg">
          <button
            type="button"
            onClick={() => {
              onDetect(false);
              setOpen(false);
            }}
            disabled={loading}
            className="flex w-full items-center justify-between rounded-t-lg px-3 py-2 text-xs transition-colors hover:bg-muted/50"
          >
            <span className="flex items-center gap-2">
              <Hammer className="size-4" />
              <span className="font-medium">Tools</span>
            </span>
            <span className="text-[10px] text-muted-foreground">
              agent calls tool directly
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              onDetect(true);
              setOpen(false);
            }}
            disabled={loading}
            className="flex w-full items-center justify-between rounded-b-lg border-border border-t px-3 py-2 text-xs transition-colors hover:bg-muted/50"
          >
            <span className="flex items-center gap-2">
              <Terminal className="size-4" />
              <span className="font-medium">Sandbox</span>
            </span>
            <span className="text-[10px] text-muted-foreground">
              agent uses bash in sandbox
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
