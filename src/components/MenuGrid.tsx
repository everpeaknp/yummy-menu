"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { BookOpen, Home, MapPin, Phone, Search, UserRound, Utensils, X } from "lucide-react";
import { getGroupedMenu, getImageUrl, getModifierGroups, MenuCategoryGroup, Restaurant } from "@/services/api";
import CategoryNav from "./CategoryNav";
import CustomerProfile from "./CustomerProfile";
import FloatingCart from "./FloatingCart";
import MenuItemCard from "./MenuItemCard";
import RestaurantExperienceHome from "./RestaurantExperienceHome";
import TableServiceActions from "./TableServiceActions";

type View = "home" | "menu" | "profile";
interface MenuGridProps { initialCategories: MenuCategoryGroup[]; restaurantId: string; restaurant?: Restaurant; }

const navigation: { id: View; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home }, { id: "menu", label: "Menu", icon: BookOpen },
  { id: "profile", label: "Profile", icon: UserRound },
];

export default function MenuGrid({ initialCategories, restaurantId, restaurant }: MenuGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<View>("home");
  const [profileSection, setProfileSection] = useState<"overview" | "orders" | "rewards">("overview");
  const { data: categories = initialCategories } = useSWR(restaurantId ? `menu-${restaurantId}` : null, () => getGroupedMenu(restaurantId), { fallbackData: initialCategories, revalidateOnFocus: false, dedupingInterval: 60000 });
  const { data: modifierGroups = [] } = useSWR(restaurantId ? `modifiers-${restaurantId}` : null, () => getModifierGroups(restaurantId), { revalidateOnFocus: false, dedupingInterval: 60000 });

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("view");
    if (requested === "orders" || requested === "rewards") { setProfileSection(requested); setView("profile"); }
    else if (navigation.some((item) => item.id === requested)) setView(requested as View);
    window.scrollTo(0, 0);
  }, []);
  const filteredCategories = useMemo(() => { if (!searchQuery.trim()) return categories || initialCategories; const query = searchQuery.toLowerCase(); return (categories || initialCategories).map((category) => ({ ...category, items: category.items.filter((item) => item.name.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query)) })).filter((category) => category.items.length); }, [categories, initialCategories, searchQuery]);
  const dishCount = useMemo(() => (categories || initialCategories).reduce((total, category) => total + category.items.length, 0), [categories, initialCategories]);
  const goTo = (next: View) => { setView(next); const url = new URL(window.location.href); next === "home" ? url.searchParams.delete("view") : url.searchParams.set("view", next); window.history.replaceState({}, "", url); window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); };

  return <main className="min-h-screen overflow-x-clip bg-[#f6f6f4] pb-24 text-stone-950 lg:pb-0">
    <header className="border-b border-white/10 bg-[#10131a] text-white"><div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:px-8"><div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/15 bg-white/10 sm:h-14 sm:w-14">{restaurant?.logo ? <Image src={getImageUrl(restaurant.logo)!} alt={`${restaurant.name} logo`} width={56} height={56} className="h-full w-full object-cover" /> : <Utensils className="h-5 w-5 text-orange-400" aria-hidden="true" />}</div><div className="min-w-0 flex-1"><p className="truncate font-display text-base font-semibold sm:text-xl">{restaurant?.name || "Restaurant"}</p><div className="mt-0.5 flex min-w-0 items-center gap-4 text-xs text-white/60 sm:mt-1 sm:text-sm">{restaurant?.address && <span className="flex min-w-0 items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0 text-orange-400" aria-hidden="true" /><span className="truncate">{restaurant.address}</span></span>}{restaurant?.phone && <span className="hidden items-center gap-1.5 sm:flex"><Phone className="h-3.5 w-3.5 text-orange-400" aria-hidden="true" />{restaurant.phone}</span>}</div></div><nav className="hidden items-center gap-1 lg:flex" aria-label="Customer navigation">{navigation.map((item) => <NavButton key={item.id} item={item} active={view === item.id} onClick={() => goTo(item.id)} />)}</nav></div></header>

    {restaurant && view === "home" && <RestaurantExperienceHome restaurant={restaurant} onOpenMenu={() => goTo("menu")} onOpenProfile={() => goTo("profile")} />}
    {view === "profile" && <CustomerProfile restaurantId={restaurantId} restaurantName={restaurant?.name} initialSection={profileSection} />}
    {view === "menu" && <MenuView categories={filteredCategories} dishCount={dishCount} modifierGroups={modifierGroups} restaurantId={restaurantId} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />}

    <FloatingCart />
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden" aria-label="Customer navigation"><div style={{ width: "calc(100% - 1.5rem)" }} className="pointer-events-auto mx-auto grid max-w-md grid-cols-3 rounded-[1.35rem] border border-white/10 bg-[#10131a] p-1.5 shadow-[0_18px_50px_rgba(16,19,26,0.28)]">{navigation.map((item) => <NavButton key={item.id} item={item} active={view === item.id} onClick={() => goTo(item.id)} mobile />)}</div></nav>
  </main>;
}

function MenuView({ categories, dishCount, modifierGroups, restaurantId, searchQuery, setSearchQuery }: { categories: MenuCategoryGroup[]; dishCount: number; modifierGroups: any[]; restaurantId: string; searchQuery: string; setSearchQuery: (value: string) => void }) {
  const search = (desktop = false) => <div className={`relative ${desktop ? "" : "mx-4 mt-3"}`}><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" /><input type="search" name={desktop ? "desktop-menu-search" : "menu-search"} autoComplete="off" aria-label="Search menu" className="min-h-12 w-full rounded-full border border-stone-200 bg-white pl-11 pr-11 text-sm text-stone-950 outline-none placeholder:text-stone-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100" placeholder="Search the menu…" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />{searchQuery && <button type="button" onClick={() => setSearchQuery("")} aria-label="Clear search" className="absolute right-1.5 top-1.5 grid h-9 w-9 place-items-center rounded-full text-stone-500 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><X className="h-4 w-4" aria-hidden="true" /></button>}</div>;
  return <div className="pb-16 lg:pb-24"><div className="mx-auto max-w-7xl px-4 pb-5 pt-6 sm:px-6 lg:flex lg:items-end lg:justify-between lg:px-8 lg:pb-8 lg:pt-10"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">{dishCount} dishes</p><h1 className="font-display text-4xl font-semibold tracking-[-0.035em] lg:text-5xl">Find your next favourite.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-stone-500 sm:text-base">Explore the kitchen by category. Your table order stays with you as you browse.</p></div><div className="mt-5 hidden w-full lg:block lg:w-80">{search(true)}</div></div>
    <div className="sticky top-0 z-30 border-y border-stone-200 bg-[#f6f6f4]/95 shadow-[0_8px_24px_rgba(28,25,23,0.06)] backdrop-blur-xl lg:hidden">{search()}<CategoryNav categories={categories} /></div>
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12 lg:px-8"><aside className="hidden border-t border-stone-200 py-6 lg:block"><div className="sticky top-6"><p className="mb-3 px-3 text-xs font-semibold text-stone-400">Browse categories</p><CategoryNav categories={categories} layout="vertical" /></div></aside>
      <div className="min-w-0 pt-6 lg:border-t lg:border-stone-200"><TableServiceActions />{categories.length ? <div className="space-y-14">{categories.map((category) => <section key={category.id} id={`category-${category.id}`} className="scroll-mt-36 [content-visibility:auto] [contain-intrinsic-size:500px]"><header className="flex items-end justify-between gap-5"><div><h2 className="font-display text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">{category.name || "Uncategorized"}</h2>{category.description && <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-500">{category.description}</p>}</div><span className="pb-1 text-xs font-medium tabular-nums text-stone-400">{category.items.length} items</span></header><div className="mt-4 grid grid-cols-1 gap-x-8 xl:grid-cols-2">{category.items.map((item) => <MenuItemCard key={item.id} item={item} modifierGroups={modifierGroups} restaurantId={restaurantId} />)}</div></section>)}</div> : <div className="border-y border-stone-200 py-16 text-center"><h2 className="font-display text-xl font-semibold">No matching dishes</h2><p className="mt-2 text-sm text-stone-600">Try another name or clear your search.</p><button type="button" onClick={() => setSearchQuery("")} className="mt-5 min-h-11 rounded-full bg-stone-950 px-5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Clear search</button></div>}</div></div>
  </div>;
}

function NavButton({ item, active, onClick, mobile = false }: { item: (typeof navigation)[number]; active: boolean; onClick: () => void; mobile?: boolean }) { const Icon = item.icon; return <button type="button" aria-current={active ? "page" : undefined} onClick={onClick} className={`${mobile ? "relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] leading-none" : "flex min-h-11 items-center gap-2 px-4 text-sm"} rounded-[1rem] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${active ? mobile ? "text-white" : "bg-white text-stone-950" : mobile ? "text-white/45 hover:bg-white/5 hover:text-white/80" : "text-white/65 hover:bg-white/10 hover:text-white"}`}><Icon className={mobile ? "h-[18px] w-[18px] shrink-0" : "h-4 w-4"} aria-hidden="true" />{item.label}{mobile && active && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-orange-500" aria-hidden="true" />}</button>; }
