"use client";

import { MenuCategoryGroup } from "@/services/api";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function CategoryNav({ categories, layout = "horizontal" }: { categories: MenuCategoryGroup[]; layout?: "horizontal" | "vertical" }) {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id);
  const [edges, setEdges] = useState({ left: false, right: false });
  const navRef = useRef<HTMLElement>(null);
  const selectionRef = useRef<{ id: number; until: number } | null>(null);
  const vertical = layout === "vertical";
  const motion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" as const : "smooth" as const;
  const anchorOffset = () => window.matchMedia("(min-width: 1024px)").matches ? 92 : 72 + (document.querySelector<HTMLElement>("[data-menu-controls]")?.offsetHeight ?? 112) + 12;

  useEffect(() => {
    const nav = navRef.current;
    if (!nav || vertical) return;
    const update = () => setEdges({ left: nav.scrollLeft > 2, right: nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 2 });
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    nav.addEventListener("scroll", update, { passive: true });
    update();
    return () => { observer.disconnect(); nav.removeEventListener("scroll", update); };
  }, [categories, vertical]);

  useEffect(() => {
    setActiveCategory(current => categories.some(category => category.id === current) ? current : categories[0]?.id);
    let frame = 0;
    const update = () => {
      frame = 0;
      const selection = selectionRef.current;
      const offset = anchorOffset();
      const target = selection && document.getElementById(`category-${selection.id}`);
      if (selection && target && Date.now() < selection.until && Math.abs(target.getBoundingClientRect().top - offset) > 8) return;
      selectionRef.current = null;
      let current = categories[0]?.id;
      for (const category of categories) {
        const element = document.getElementById(`category-${category.id}`);
        if (element && element.getBoundingClientRect().top <= offset + 8) current = category.id;
      }
      setActiveCategory(current);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, [categories]);

  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>(`[data-category="${activeCategory}"]`);
    if (!nav || !active) return;
    const bounds = nav.getBoundingClientRect();
    const item = active.getBoundingClientRect();
    if (vertical) {
      if (item.top < bounds.top || item.bottom > bounds.bottom) nav.scrollTo({ top: nav.scrollTop + item.top - bounds.top - nav.clientHeight / 2 + item.height / 2, behavior: motion() });
    } else if (item.left < bounds.left + 8 || item.right > bounds.right - 8) {
      nav.scrollTo({ left: nav.scrollLeft + item.left - bounds.left - nav.clientWidth / 2 + item.width / 2, behavior: motion() });
    }
  }, [activeCategory, vertical]);

  const select = (id: number) => {
    const element = document.getElementById(`category-${id}`);
    if (!element) return;
    selectionRef.current = { id, until: Date.now() + 1000 };
    setActiveCategory(id);
    window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - anchorOffset(), behavior: motion() });
  };
  const slide = (direction: number) => {
    const nav = navRef.current;
    if (nav) nav.scrollBy({ left: direction * nav.clientWidth * 0.75, behavior: motion() });
  };

  return <div className={vertical ? "" : "flex items-center gap-1 px-3 py-2 sm:px-5"}>
    {!vertical && <button type="button" aria-label="Previous categories" disabled={!edges.left} onClick={() => slide(-1)} className="grid h-11 w-7 shrink-0 place-items-center rounded-lg text-stone-600 hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-orange-500 disabled:text-stone-200"><ChevronLeft size={18} aria-hidden="true" /></button>}
    <nav ref={navRef} aria-label="Menu categories" className={vertical ? "max-h-[calc(100vh-7rem)] space-y-0.5 overflow-y-auto overscroll-contain pr-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]" : "flex min-w-0 flex-1 touch-pan-x gap-1.5 overflow-x-auto overscroll-x-contain py-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"}>{categories.map(category => {
      const active = activeCategory === category.id;
      return <button key={category.id} data-category={category.id} type="button" title={category.name || "Uncategorized"} aria-current={active ? "true" : undefined} onClick={() => select(category.id)} className={vertical ? `group flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${active ? "bg-orange-50 font-semibold text-orange-700" : "font-medium text-stone-600 hover:bg-white hover:text-stone-950"}` : `flex min-h-11 max-w-[11rem] shrink-0 items-center rounded-lg border px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500 ${active ? "border-orange-200 bg-orange-50 text-orange-700" : "border-transparent text-stone-500 hover:bg-stone-50 hover:text-stone-950"}`}>
        <span className="min-w-0 flex-1 truncate">{category.name || "Uncategorized"}</span>
        {vertical && <span className="text-xs tabular-nums text-stone-400">{category.items.length}</span>}
      </button>;
    })}</nav>
    {!vertical && <button type="button" aria-label="Next categories" disabled={!edges.right} onClick={() => slide(1)} className="grid h-11 w-7 shrink-0 place-items-center rounded-lg text-stone-600 hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-orange-500 disabled:text-stone-200"><ChevronRight size={18} aria-hidden="true" /></button>}
  </div>;
}
