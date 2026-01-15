"use client";

import { MenuCategoryGroup } from "@/services/api";
import CategoryNav from "./CategoryNav";
import MenuItemCard from "./MenuItemCard";
import { useState, useMemo } from "react";
import { Search } from "lucide-react";

interface MenuGridProps {
  categories: MenuCategoryGroup[];
}

export default function MenuGrid({ categories }: MenuGridProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;
    const lowerQuery = searchQuery.toLowerCase();
    
    return categories.map(cat => ({
      ...cat,
      items: cat.items.filter(item => 
        item.name.toLowerCase().includes(lowerQuery) || 
        item.description?.toLowerCase().includes(lowerQuery)
      )
    })).filter(cat => cat.items.length > 0);
  }, [categories, searchQuery]);

  if (!categories || categories.length === 0) {
      return (
          <div className="flex min-h-[50vh] items-center justify-center">
              <p className="text-gray-500">No menu items available.</p>
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <CategoryNav categories={filteredCategories} />
      
      {/* Search Bar */}
      <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6 lg:max-w-7xl lg:px-8">
          <div className="relative mb-6">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              className="block w-full rounded-full border border-gray-200 bg-white py-3 pl-10 pr-4 text-gray-900 placeholder-gray-500 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
              placeholder="Search for dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        
        {/* Main Section Header */}
        <div className="text-center mb-12">
            <span className="font-serif italic text-3xl text-yellow-600 block">
                Yummy & Delicious
            </span>
        </div>

        <div className="space-y-20 pb-24">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((category) => (
                <section 
                    key={category.id} 
                    id={`category-${category.id}`} 
                    className="scroll-mt-28"
                >
                {/* Category Header */}
                <div className="py-8 text-center">
                    <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                      {category.name || "Uncategorized"}
                    </h2>
                    <div className="mx-auto mt-3 h-1.5 w-24 rounded-full bg-amber-400" />
                </div>        
                    {category.description && (
                        <p className="mt-4 text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
                            {category.description}
                        </p>
                    )}

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {category.items.map((item) => (
                    <MenuItemCard key={item.id} item={item} />
                    ))}
                </div>
                </section>
            ))
          ) : (
              <div className="text-center py-12">
                  <p className="text-gray-500">No items found for &quot;{searchQuery}&quot;</p>
              </div>
          )}
        </div>
      </div>
    </div>
  );
}
