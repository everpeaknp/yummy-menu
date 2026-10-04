import Image from "next/image";
import Link from "next/link";
import { ArrowDown, UserRound } from "lucide-react";
import CustomerProfile from "@/components/CustomerProfile";
import RestaurantList from "@/components/RestaurantList";
import { getAllRestaurants } from "@/services/api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const restaurants = await getAllRestaurants();

  return (
    <main id="main-content" className="min-h-[100dvh] bg-[#f6f6f3] font-body text-stone-950">
      <a href="#customer-home" className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-full bg-white px-5 py-3 text-sm font-semibold shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-orange-500">
        Skip to your account
      </a>

      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Yummy home" className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
            <Image src="/logos/yummy_logo.png" alt="" width={40} height={40} className="h-9 w-9 object-contain" priority unoptimized />
            <span className="font-display text-xl font-semibold tracking-[-0.03em]">Yummy</span>
          </Link>
          <nav className="flex items-center gap-2" aria-label="Main navigation">
            <a href="#discover" className="hidden min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-stone-600 hover:bg-stone-100 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 sm:inline-flex">
              Find restaurants <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </a>
            <Link href="/profile" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-stone-950 px-4 text-sm font-semibold text-white hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2">
              <UserRound className="h-4 w-4" aria-hidden="true" /> Account
            </Link>
          </nav>
        </div>
      </header>

      <section id="customer-home" aria-label="Your Yummy account" className="scroll-mt-4 border-b border-stone-200 bg-[#f6f6f3]">
        <CustomerProfile />
      </section>

      <section id="discover" aria-labelledby="discover-title" className="scroll-mt-4 bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 border-b border-stone-200 pb-8 md:grid-cols-[1fr_0.8fr] md:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">Restaurant network</p>
              <h2 id="discover-title" className="mt-4 max-w-2xl text-balance font-display text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl">
                Add another place to your Yummy life.
              </h2>
            </div>
            <p className="max-w-lg text-sm leading-7 text-stone-600 md:justify-self-end">
              Open a restaurant to browse, order from a signed table QR, or follow it for updates. Your account travels with you.
            </p>
          </div>
          <RestaurantList initialRestaurants={restaurants} />
        </div>
      </section>

      <footer className="border-t border-stone-800 bg-stone-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-9 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex items-center gap-2.5"><Image src="/logos/yummy_logo.png" alt="" width={32} height={32} className="h-8 w-8 object-contain" unoptimized /><span className="font-display text-lg font-semibold">Yummy</span></div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/55">
            <a href="https://www.yummyever.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="rounded-sm hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Privacy</a>
            <a href="https://www.yummyever.com/terms-and-conditions" target="_blank" rel="noopener noreferrer" className="rounded-sm hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Terms</a>
            <a href="https://www.yummyever.com/contact" target="_blank" rel="noopener noreferrer" className="rounded-sm hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Contact</a>
            <span>© 2026 Yummy Ever</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
