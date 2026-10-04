"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { getImageUrl, MenuItem } from "@/services/api";
import ItemCustomizationDrawer from "./ItemCustomizationDrawer";

const currency = new Intl.NumberFormat("en-NP", { style: "currency", currency: "NPR", maximumFractionDigits: 0 });

interface MenuItemCardProps {
  item: MenuItem;
  modifierGroups?: any[];
  restaurantId: string;
}

export default function MenuItemCard({ item, modifierGroups = [] }: MenuItemCardProps) {
  const { addToCart, updateQuantity, cart } = useCart();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const hasModifiers = Boolean(item.modifier_group_ids?.length);
  const itemQty = useMemo(() => cart.filter((entry) => entry.id === item.id).reduce((sum, entry) => sum + entry.quantity, 0), [cart, item.id]);

  const increment = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (hasModifiers) return setIsDrawerOpen(true);
    itemQty ? updateQuantity(item.id, 1) : addToCart(item);
  };

  const decrement = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (itemQty) updateQuantity(item.id, -1);
  };

  return (
    <article className="group relative flex min-h-32 w-full min-w-0 max-w-full gap-4 border-t border-stone-200 py-5 sm:gap-5">
      {item.image && <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-stone-100 sm:h-28 sm:w-28"><Image src={getImageUrl(item.image)!} alt={item.name} fill unoptimized={item.image.startsWith("/")} className="object-cover transition-transform duration-500 motion-reduce:transition-none group-hover:scale-[1.03]" sizes="(max-width: 640px) 96px, 112px" /></div>}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-start justify-between gap-3"><h3 className="min-w-0 line-clamp-2 font-display text-base font-semibold leading-snug text-stone-950 sm:text-lg">{item.name}</h3>{item.category_type && <span className="hidden shrink-0 text-[11px] capitalize tracking-wide text-stone-400 sm:block">{item.category_type}</span>}</div>
        {item.description && <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-stone-500 sm:text-sm">{item.description}</p>}
        {item.dietary_info?.length ? <p className="mt-2 truncate text-xs text-stone-400">{item.dietary_info.join(" · ")}</p> : null}
        <div className="mt-auto flex min-h-11 items-end pt-3 pr-14">
          <p className="text-sm font-semibold tabular-nums text-stone-950 sm:text-base">{currency.format(item.price)}</p>
          {hasModifiers ? <div className="absolute bottom-5 right-0 flex items-center gap-2">{itemQty > 0 && <span className="text-sm font-semibold tabular-nums text-stone-700">{itemQty}</span>}<AddButton label={`Customize ${item.name}`} onClick={increment} /></div> : itemQty === 0 ? <div className="absolute bottom-5 right-0"><AddButton label={`Add ${item.name} to cart`} onClick={increment} /></div> : <div className="absolute bottom-5 right-0 flex h-10 items-center rounded-full border border-orange-200 bg-orange-50"><button type="button" onClick={decrement} className="grid h-10 w-10 place-items-center rounded-full text-orange-800 hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" aria-label={`Decrease ${item.name} quantity`}><Minus className="h-4 w-4" aria-hidden="true" /></button><span className="min-w-6 text-center text-sm font-semibold tabular-nums text-orange-950" aria-live="polite">{itemQty}</span><button type="button" onClick={increment} className="grid h-10 w-10 place-items-center rounded-full text-orange-900 hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" aria-label={`Increase ${item.name} quantity`}><Plus className="h-4 w-4" aria-hidden="true" /></button></div>}
        </div>
      </div>
      <ItemCustomizationDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} item={item} modifierGroups={modifierGroups} onAddToCart={(selectedItem, notes, modifiers) => addToCart(selectedItem, notes, modifiers)} />
    </article>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: (event: React.MouseEvent<HTMLButtonElement>) => void }) {
  return <button type="button" onClick={onClick} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-stone-950 text-white hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 active:scale-95" aria-label={label}><Plus className="h-4 w-4" aria-hidden="true" /></button>;
}
