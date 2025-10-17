import { OutfitDisplay } from "@/components/outfit-display";
import { ToolsSection } from "@/components/tools-section";

export default function OutfitPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <OutfitDisplay />
        <ToolsSection />
      </div>
    </main>
  );
}