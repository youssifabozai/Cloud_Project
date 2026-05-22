import Link from "next/link";
import { AlertTriangle, Box } from "lucide-react";

export default function NotFound() {
  return (
    <main className="cloud-page min-h-screen px-4 pt-6 text-[#202633] sm:px-8">
      <nav className="cloud-nav mx-auto flex h-[76px] max-w-7xl items-center justify-between rounded-[24px] px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="cloud-logo flex h-10 w-10 items-center justify-center rounded-xl text-white">
            <Box className="h-5 w-5" />
          </span>
          <span className="text-2xl font-black">CloudJira</span>
        </Link>
        <Link href="/" className="cloud-button rounded-xl px-6 py-3 text-base font-extrabold">
          Try for free
        </Link>
      </nav>

      <section className="mx-auto flex min-h-[760px] max-w-5xl flex-col items-center justify-end pb-20 text-center">
        <div className="mb-5 rotate-6 rounded-2xl border border-white/70 bg-white/50 p-4 shadow-premium backdrop-blur-xl">
          <AlertTriangle className="h-10 w-10 text-[#2563EB]" />
        </div>
        <h1 className="text-6xl font-black leading-none sm:text-7xl lg:text-8xl">Ooops! Page not found</h1>
        <p className="mt-8 max-w-3xl text-xl font-medium leading-9 text-[#334155]">
          Looks like this page is not on the map. Do not worry, your team messages and projects are still just a click away.
        </p>
        <Link href="/" className="cloud-button mt-10 rounded-2xl px-9 py-4 text-xl font-extrabold">
          Back to Home
        </Link>
      </section>
    </main>
  );
}
