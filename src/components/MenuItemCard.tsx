"use client";

import { MenuItem } from "@/services/api";
import Image from "next/image";
import { Plus, Star } from "lucide-react";

interface MenuItemCardProps {
  item: MenuItem;
}

export default function MenuItemCard({ item }: MenuItemCardProps) {
  return (
    <div className="group relative flex flex-col items-center bg-transparent p-4 transition-all duration-300 hover:-translate-y-2">
      {/* Image Section - Large & Rounded */}
      <div className="relative aspect-square w-full overflow-hidden rounded-3xl shadow-md transition-shadow duration-300 group-hover:shadow-2xl">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div className="h-full w-full bg-gray-100 flex items-center justify-center">
            <span className="text-4xl">🍽️</span>
          </div>
        )}
        
        {/* Availability Badge */}
        {item.is_available === false && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
            <span className="rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold text-white border border-white/30 backdrop-blur-md">
                Sold Out
            </span>
            </div>
        )}

        {/* Floating Add Button */}
        <button 
            className="absolute bottom-4 right-4 flex items-center justify-center w-10 h-10 rounded-full bg-white text-black shadow-lg opacity-0 transform translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 hover:bg-black hover:text-white"
            aria-label="Add to cart"
        >
            <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* Content Section - Centered */}
      <div className="mt-5 text-center w-full">
        <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors mb-1">
          {item.name}
        </h3>
        
        {/* Mock Ratings for Premium Feel */}
        <div className="flex items-center justify-center gap-1 my-2">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} size={14} className="fill-yellow-400 text-yellow-400" />
            ))}
            <span className="text-xs text-gray-400 ml-1">(12 reviews)</span>
        </div>

        <div className="flex items-center justify-center gap-2">
             <span className="text-sm text-gray-500 font-medium">From</span>
             <span className="text-lg font-bold text-gray-900">
                Rs {item.price.toFixed(0)}
             </span>
        </div>
      </div>
    </div>
  );
}
