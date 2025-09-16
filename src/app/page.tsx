import Image from "next/image";
import Link from "next/link";

export default async function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden p-6">
      <div className="absolute inset-0">
        <div className="-z-10 absolute inset-0 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-white [background-size:16px_16px]" />
      </div>

      <div className="relative z-20 mx-auto flex max-w-4xl flex-col items-center justify-center text-center">
        <div className="mb-10 flex items-center justify-center gap-6">
          <Image
            src="/nextjs.svg"
            alt="Next.js Logo"
            width={100}
            height={100}
          />
        </div>

        <h1 className="mb-4 font-extrabold text-4xl text-gray-900">
          AI Agent Starter
        </h1>

        <p className="mb-8 text-gray-600 text-lg">
          A complete AI agent starter built with{" "}
          <Link className="font-bold underline" href="https://sdk.vercel.ai">
            Vercel AI SDK
          </Link>
          , featuring webhook triggers, tool integration, and{" "}
          <Link
            className="font-bold underline"
            href="https://vercel.com/docs/ai-gateway"
          >
            Vercel AI Gateway
          </Link>
          . Includes example agents for outfit recommendations with weather,
          closet, and friend advice tools.
        </p>

        <Link
          href="/outfit"
          className="inline-flex items-center justify-center rounded-md bg-gray-900 px-6 py-3 font-medium text-white transition-colors hover:bg-gray-800"
        >
          Try Now
        </Link>
      </div>
    </main>
  );
}
