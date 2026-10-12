"use client";

import { useState } from "react";

import { Header } from "@/components/header";
import { ThemeToggle } from "@/components/theme-toggle";
import { TransactionList } from "@/components/transaction-list";

export default function Page() {
  const [isDark, setIsDark] = useState(true);

  return (
    <main className={isDark ? "dark min-h-screen bg-background text-foreground" : "min-h-screen bg-background text-foreground"}>
      <div className="mx-auto max-w-6xl px-6 py-8 sm:py-16">
        <div className="mb-4 flex justify-end">
          <ThemeToggle isDark={isDark} onToggle={() => setIsDark((current) => !current)} />
        </div>
        <Header />
        <TransactionList />
      </div>
    </main>
  );
}
