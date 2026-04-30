"use client";

import { MenuItem, getImageUrl } from "@/services/api";
import Image from "next/image";
import { Minus, Plus } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useMemo, useState } from "react";

import ItemCustomizationDrawer from "./ItemCustomizationDrawer";

interface MenuItemCardProps {
  item: MenuItem;
  modifierGroups?: any[];
  restaurantId: string;
}

export default function MenuItemCard({ item, modifierGroups = [], restaurantId }: MenuItemCardProps) {
  const { addToCart, updateQuantity, cart } = useCart();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const hasModifiers = item.modifier_group_ids && item.modifier_group_ids.length > 0;

  const itemQty = useMemo(
    () => cart.filter((c) => c.id === item.id).reduce((sum, c) => sum + c.quantity, 0),
    [cart, item.id]
  );

  const handleIncrement = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasModifiers) {
      setIsDrawerOpen(true);
      return;
    }
    if (itemQty > 0) {
      updateQuantity(item.id, 1);
    } else {
      addToCart(item);
    }
  };

  const handleDecrement = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (itemQty <= 0) return;
    updateQuantity(item.id, -1);
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Ignore clicks from interactive controls; let their own handlers run.
    if (target.closest("button,a,input,textarea,select,label")) return;
    // For modifier items, tapping card opens customization.
    if (hasModifiers) {
      setIsDrawerOpen(true);
    }
  };

  const handleCustomAddToCart = (item: MenuItem, notes: string, selectedModifiers: any[]) => {
    addToCart(item, notes, selectedModifiers);
  };

  return (
    <div 
        className="group relative flex w-full cursor-pointer flex-row items-center gap-4 rounded-xl bg-white p-3 shadow-sm transition-all duration-300 hover:shadow-md sm:h-full sm:flex-col sm:justify-between sm:gap-0 sm:p-4"
        onClick={handleCardClick}
    >
      
      {/* Image Section */}
      {/* Mobile: Fixed small square (w-24 h-24). Desktop: Full width aspect 4:3 */}
      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-50 sm:aspect-[4/3] sm:h-auto sm:w-full sm:rounded-2xl">
        {item.image ? (
          <Image
            src={getImageUrl(item.image)!}
            alt={item.name}
            fill
            unoptimized={item.image.startsWith('/')}
            className="object-contain p-1 sm:object-contain sm:p-4 sm:transition-transform sm:duration-700 sm:group-hover:scale-110"
            sizes="(max-width: 640px) 96px, (max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100">
            <span className="text-2xl sm:text-4xl">🍽️</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-1 flex-col justify-between sm:mt-4 sm:w-full sm:text-center">
        <div className="flex flex-col items-start sm:items-center">
            {/* Mobile: Name & Price same line? Or Name top, price bottom. Let's follow screenshot: Title, Desc, Price */}
            
            <div className="flex w-full items-start justify-between sm:justify-center">
                <h3 className="line-clamp-1 text-base font-bold text-gray-900 group-hover:text-primary-600 sm:text-lg">
                    {item.name}
                </h3>
            </div>

            {/* Description */}
            <p className="mt-1 line-clamp-2 text-xs text-gray-500 sm:px-2">
                {item.description || " "}
            </p>
            
            {/* Category Tag (Mobile: Hidden or Small? Let's hide on very small mobile to save space, or show small) */}
            {item.category_type && (
                <span className="mt-1 inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary-700 capitalize sm:mx-auto sm:mt-2">
                    {item.category_type}
                </span>
            )}
        </div>

        {/* Price & Action */}
        <div className="mt-2 flex w-full items-center justify-between sm:mt-3 sm:justify-center">
            <div className="flex items-baseline gap-1">
                <span className="text-xs text-gray-400 font-medium">NPR</span>
                <span className="text-lg font-bold text-gray-900">
                    {item.price.toFixed(0)}
                </span>
            </div>
            
            {hasModifiers ? (
              <div className="flex items-center gap-2 sm:absolute sm:bottom-4 sm:right-4">
                {itemQty > 0 && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-800">
                    {itemQty}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white shadow-md transition-all active:scale-95 sm:h-10 sm:w-10"
                  aria-label="Customize and add"
                >
                  <Plus size={16} strokeWidth={2.5} className="sm:h-5 sm:w-5" />
                </button>
              </div>
            ) : itemQty === 0 ? (
              <button
                type="button"
                onClick={handleIncrement}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white shadow-md transition-all active:scale-95 sm:absolute sm:bottom-4 sm:right-4 sm:h-10 sm:w-10 sm:translate-y-4 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
                aria-label="Add to cart"
              >
                <Plus size={16} strokeWidth={2.5} className="sm:h-5 sm:w-5" />
              </button>
            ) : (
              <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm sm:absolute sm:bottom-4 sm:right-4">
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700"
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span className="min-w-5 text-center text-sm font-bold text-slate-900">{itemQty}</span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-white"
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>
            )}
        </div>
      </div>

      <ItemCustomizationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        item={item}
        modifierGroups={modifierGroups}
        onAddToCart={handleCustomAddToCart}
      />
    </div>
  );
}
