"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Search, Utensils, X } from "lucide-react";
import { Restaurant, getImageUrl } from "@/services/api";
import { slugify } from "@/config/restaurants";

interface RestaurantListProps { initialRestaurants: Restaurant[]; }
const PAGE_SIZE = 6;

export default function RestaurantList({ initialRestaurants }: RestaurantListProps) {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return initialRestaurants;
    return initialRestaurants.filter((restaurant) => [restaurant.name, restaurant.address, restaurant.phone].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [initialRestaurants, query]);
  const visible = matches.slice(0, visibleCount);

  if (!initialRestaurants.length) return <div className="py-16 text-center"><Utensils className="mx-auto h-7 w-7 text-orange-600" aria-hidden="true" /><h3 className="mt-4 font-display text-2xl font-semibold">Restaurants are on the way</h3><p className="mt-2 text-sm text-stone-500">Please check back shortly.</p></div>;

  return <div className="mt-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-stone-500" aria-live="polite"><span className="font-semibold text-stone-950">{matches.length}</span> {matches.length === 1 ? "restaurant" : "restaurants"}</p>
      <label className="relative block w-full sm:max-w-sm"><span className="sr-only">Search restaurants</span><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" /><input type="search" name="restaurant-search" autoComplete="off" spellCheck={false} value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(PAGE_SIZE); }} placeholder="Search restaurants…" className="min-h-12 w-full rounded-xl border border-stone-300 bg-white pl-11 pr-11 text-base sm:text-sm text-stone-950 outline-none placeholder:text-stone-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear restaurant search" className="absolute right-1.5 top-1.5 grid h-9 w-9 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><X className="h-4 w-4" aria-hidden="true" /></button>}</label>
    </div>

    {visible.length ? <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{visible.map((restaurant) => <Link key={restaurant.id} href={`/${restaurant.id}/${slugify(restaurant.name)}`} className="group overflow-hidden rounded-2xl border border-stone-200 bg-white transition-[border-color,transform,box-shadow] hover:-translate-y-1 hover:border-stone-300 hover:shadow-[0_18px_50px_rgba(28,25,23,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
      <div className="relative aspect-[16/9] overflow-hidden bg-stone-100">{restaurant.cover_image ? <Image src={getImageUrl(restaurant.cover_image)!} alt="" fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]" /> : <div className="grid h-full place-items-center text-stone-300"><Utensils className="h-8 w-8" aria-hidden="true" /></div>}</div>
      <div className="p-5"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><h3 className="truncate font-display text-xl font-semibold tracking-tight">{restaurant.name}</h3><p className="mt-2 flex items-start gap-2 text-sm leading-6 text-stone-500"><MapPin className="mt-1 h-3.5 w-3.5 shrink-0 text-orange-600" aria-hidden="true" /><span className="line-clamp-2">{restaurant.address || "Location available at the restaurant"}</span></p></div>{restaurant.logo && <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-white"><Image src={getImageUrl(restaurant.logo)!} alt="" fill sizes="44px" className="object-cover" /></span>}</div><span className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-stone-950 group-hover:text-orange-700">Open restaurant <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span></div>
    </Link>)}</div> : <div className="py-16 text-center"><Search className="mx-auto h-7 w-7 text-stone-400" aria-hidden="true" /><h3 className="mt-4 font-display text-2xl font-semibold">No matching restaurant</h3><button type="button" onClick={() => setQuery("")} className="mt-4 min-h-11 text-sm font-semibold text-orange-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Clear search</button></div>}

    {visibleCount < matches.length && <div className="mt-9 flex justify-center"><button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="min-h-12 rounded-xl border border-stone-300 bg-white px-6 text-sm font-semibold hover:border-stone-950 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Show 6 more</button></div>}
  </div>;
}
