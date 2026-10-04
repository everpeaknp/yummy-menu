import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { BookOpen } from "lucide-react";
import CustomerProfile from "@/components/CustomerProfile";

export const metadata: Metadata = {
  title: "Your profile",
  description: "Your Yummy restaurants, orders, points and rewards.",
};

export default function ProfilePage() {
  return <div className="min-h-screen bg-[#f6f6f4] text-stone-950">
    <header className="border-b border-white/10 bg-[#10131a] text-white"><div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"><Link href="/" className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><Image src="/logos/yummy_logo.png" alt="Yummy" width={42} height={42} className="h-10 w-10 rounded-xl object-contain" unoptimized /><span className="font-display text-xl font-semibold">Yummy</span></Link><Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-sm font-semibold text-white/75 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><BookOpen className="h-4 w-4" aria-hidden="true" /> Browse restaurants</Link></div></header>
    <CustomerProfile />
  </div>;
}
