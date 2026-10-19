"use client";

import Image from 'next/image';
import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { getImageUrl, MenuItem } from '@/services/api';
import { money } from '@/lib/money';
import ItemCustomizationDrawer from './ItemCustomizationDrawer';

export default function MenuItemCard({ item, modifierGroups = [] }: { item: MenuItem; modifierGroups?: any[]; restaurantId: string }) {
  const { addToCart, updateQuantity, cart } = useCart();
  const [open, setOpen] = useState(false);
  const hasModifiers = Boolean(item.modifier_group_ids?.length);
  const lines = cart.filter(line => line.id === item.id);
  const quantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const available = item.is_available !== false;
  const increment = () => { if (hasModifiers) setOpen(true); else addToCart(item); };
  return <article className="menu-dish flex min-w-0 gap-4 p-4 sm:p-5">
    <div className="min-w-0 flex-1">
      <h4 className="break-words"><button type="button" onClick={() => setOpen(true)} className="text-left text-base font-semibold leading-6 text-stone-950 hover:text-orange-700">{item.name}</button></h4>
      {item.description && <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-stone-600">{item.description}</p>}
      {Boolean(item.dietary_info?.length) && <p className="mt-2 text-xs font-medium text-stone-600">{item.dietary_info?.join(' · ')}</p>}
      <p className="mt-3 text-sm font-semibold tabular-nums">{money(Number(item.price))}</p>
      {hasModifiers && <p className="mt-1 text-xs text-stone-600">Options available</p>}
    </div>
    <div className="flex w-[108px] shrink-0 flex-col items-center justify-between gap-3">
      {item.image && <button type="button" onClick={() => setOpen(true)} aria-label={`View ${item.name}`} className="relative h-[88px] w-[108px] overflow-hidden rounded-xl bg-stone-100"><Image src={getImageUrl(item.image)!} alt="" fill unoptimized sizes="108px" className="object-cover" /></button>}
      <div className="mt-auto">{!available ? <span className="inline-flex min-h-11 items-center text-xs font-medium text-stone-600">Unavailable</span> : quantity > 0 && !hasModifiers ? <div className="flex items-center rounded-xl border border-orange-200 bg-orange-50"><button type="button" onClick={() => updateQuantity(lines[lines.length - 1].lineId, -1)} aria-label={`Decrease ${item.name} quantity`} className="grid h-11 w-10 place-items-center text-orange-700"><Minus size={16} /></button><span className="min-w-5 text-center text-sm font-semibold text-orange-700" aria-live="polite">{quantity}</span><button type="button" onClick={increment} aria-label={`Increase ${item.name} quantity`} className="grid h-11 w-10 place-items-center text-orange-700"><Plus size={16} /></button></div> : <button type="button" onClick={increment} aria-label={hasModifiers ? `Customize ${item.name}` : `Add ${item.name} to order`} className="flex min-h-11 min-w-[104px] items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 text-sm font-semibold text-orange-700 hover:bg-orange-100">{quantity > 0 ? quantity : null}<Plus size={16} aria-hidden="true" />{hasModifiers ? 'Choose' : 'Add'}</button>}</div>
    </div>
    <ItemCustomizationDrawer isOpen={open} onClose={() => setOpen(false)} item={item} modifierGroups={modifierGroups} onAddToCart={addToCart} />
  </article>;
}
