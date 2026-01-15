"use client";

import { cn } from "@/lib/utils";
import { MenuCategoryGroup } from "@/services/api";
import { useEffect, useRef, useState } from "react";

interface CategoryNavProps {
  categories: MenuCategoryGroup[];
}

export default function CategoryNav({ categories }: CategoryNavProps) {
  const [activeCategory, setActiveCategory] = useState<number>(categories[0]?.id);
  const navRef = useRef<HTMLDivElement>(null);

  const scrollToCategory = (id: number) => {
    setActiveCategory(id);
    const element = document.getElementById(`category-${id}`);
    if (element) {
      // Offset for sticky header
      const offset = 80; 
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-100/50 supports-[backdrop-filter]:bg-white/60">
      <div 
        ref={navRef}
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center gap-4 overflow-x-auto py-4 scrollbar-hide"
      >
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => scrollToCategory(category.id)}
            className={cn(
              "flex-shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-all duration-300 whitespace-nowrap border",
              activeCategory === category.id
                ? "bg-gray-900 border-gray-900 text-white shadow-lg shadow-gray-900/20 transform scale-105"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            {category.name || "Uncategorized"}
          </button>
        ))}
      </div>
    </div>
  );
}
