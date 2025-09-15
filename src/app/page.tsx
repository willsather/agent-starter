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

        <h1 className="mb-4 font-extrabold text-gray-900">
          Welcome to Next.js Starter
        </h1>

        <p className="mb-8 text-gray-600 text-lg">
          This starter is powered by{" "}
          <Link className="font-bold underline" href="https://nextjs.org">
            Next.js
          </Link>
          , the most popular React Framework, preconfigured with batteries
          included tools like{" "}
          <Link className="font-bold underline" href="https://tailwindcss.com">
            Tailwind
          </Link>
          ,{" "}
          <Link className="font-bold underline" href="https://ui.shadcn.com">
            shadcn/ui
          </Link>
          ,{" "}
          <Link className="font-bold underline" href="https://biomejs.dev">
            Biome
          </Link>
          , and{" "}
          <Link className="font-bold underline" href="https://vitest.dev">
            Vitest
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
