"use client";

import { MenuCategoryGroup } from "@/services/api";
import { useEffect, useRef, useState } from "react";

export default function CategoryNav({ categories, layout = "horizontal" }: { categories: MenuCategoryGroup[]; layout?: "horizontal" | "vertical" }) {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveCategory((current) => categories.some((category) => category.id === current) ? current : categories[0]?.id);
    const observer = new IntersectionObserver((entries) => { const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (visible) setActiveCategory(Number(visible.target.id.replace("category-", ""))); }, { rootMargin: "-145px 0px -65% 0px", threshold: 0 });
    categories.forEach((category) => { const element = document.getElementById(`category-${category.id}`); if (element) observer.observe(element); });
    return () => observer.disconnect();
  }, [categories]);

  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>(`[data-category="${activeCategory}"]`);
    if (!nav || !active) return;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    if (layout === "vertical") {
      nav.scrollTo({ top: active.offsetTop - nav.clientHeight / 2 + active.clientHeight / 2, behavior });
    } else {
      nav.scrollTo({ left: active.offsetLeft - nav.offsetLeft - nav.clientWidth / 2 + active.clientWidth / 2, behavior });
    }
  }, [activeCategory, layout]);

  const select = (id: number) => { setActiveCategory(id); const element = document.getElementById(`category-${id}`); if (!element) return; const top = element.getBoundingClientRect().top + window.scrollY - (window.matchMedia("(min-width: 1024px)").matches ? 92 : 195); window.scrollTo({ top, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); };

  const vertical = layout === "vertical";
  return <nav ref={navRef} aria-label="Menu categories" className={vertical ? "max-h-[calc(100vh-7rem)] space-y-0.5 overflow-y-auto overscroll-contain pr-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]" : "flex gap-2 overflow-x-auto px-4 py-3 sm:px-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"}>{categories.map((category) => {
    const active = activeCategory === category.id;
    return <button key={category.id} data-category={category.id} type="button" aria-current={active ? "true" : undefined} onClick={() => select(category.id)} className={vertical ? `group flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${active ? "bg-stone-950 font-semibold text-white" : "font-medium text-stone-600 hover:bg-white hover:text-stone-950"}` : `min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${active ? "bg-stone-950 text-white shadow-sm" : "border border-stone-200 bg-white text-stone-600 hover:border-stone-400 hover:text-stone-950"}`}>
      {vertical && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? "bg-orange-500" : "bg-stone-300 group-hover:bg-stone-500"}`} aria-hidden="true" />}
      <span className="min-w-0 flex-1 truncate">{category.name || "Uncategorized"}</span>
      {vertical && <span className={`text-xs tabular-nums ${active ? "text-white/50" : "text-stone-400"}`}>{category.items.length}</span>}
    </button>;
  })}</nav>;
}
