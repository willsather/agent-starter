import { Header } from "@/components/header";
import { TransactionList } from "@/components/transaction-list";

export default function Page() {
  return (
    <main className="dark min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Header />
        <TransactionList />
      </div>
    </main>
  );
}
