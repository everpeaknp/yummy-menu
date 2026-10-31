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
  return <article className="menu-dish grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 px-4 py-4 sm:px-5">
    <div className="min-w-0">
      <h4 className="break-words"><button type="button" onClick={() => setOpen(true)} className="text-left text-[15px] font-semibold leading-6 text-stone-950 hover:text-orange-700 focus-visible:rounded focus-visible:ring-2 focus-visible:ring-orange-500">{item.name}</button></h4>
      {item.description && <p className="mt-1 line-clamp-2 text-sm leading-5 text-stone-600">{item.description}</p>}
      {Boolean(item.dietary_info?.length) && <p className="mt-1.5 text-xs font-medium text-stone-600">{item.dietary_info?.join(' · ')}</p>}
    </div>
    {item.image && <button type="button" onClick={() => setOpen(true)} aria-label={`View ${item.name}`} className="relative h-[76px] w-[76px] overflow-hidden rounded-lg bg-stone-100 focus-visible:ring-2 focus-visible:ring-orange-500"><Image src={getImageUrl(item.image)!} alt="" fill unoptimized sizes="76px" className="object-cover" /></button>}
    <div className="col-span-2 flex min-w-0 items-center justify-between gap-3">
      <div><p className="text-sm font-semibold tabular-nums text-stone-950">{money(Number(item.price))}</p>{hasModifiers && <p className="mt-0.5 text-xs text-stone-600">Options available</p>}</div>
      {!available ? <span className="inline-flex min-h-11 w-[116px] items-center justify-center rounded-lg bg-stone-100 px-2 text-xs font-medium text-stone-600">Unavailable</span> : quantity > 0 && !hasModifiers ? <div className="flex w-[116px] items-center rounded-lg border border-orange-200 bg-orange-50"><button type="button" onClick={() => updateQuantity(lines[lines.length - 1].lineId, -1)} aria-label={`Decrease ${item.name} quantity`} className="grid h-11 w-11 shrink-0 place-items-center rounded-l-lg text-orange-700 hover:bg-orange-100 focus-visible:ring-2 focus-visible:ring-orange-500"><Minus size={16} aria-hidden="true" /></button><span className="min-w-0 flex-1 text-center text-sm font-semibold tabular-nums text-stone-950" aria-live="polite">{quantity}</span><button type="button" onClick={increment} aria-label={`Increase ${item.name} quantity`} className="grid h-11 w-11 shrink-0 place-items-center rounded-r-lg text-orange-700 hover:bg-orange-100 focus-visible:ring-2 focus-visible:ring-orange-500"><Plus size={16} aria-hidden="true" /></button></div> : <button type="button" onClick={increment} aria-label={hasModifiers ? `Customize ${item.name}` : `Add ${item.name} to order`} className="flex min-h-11 w-[116px] items-center justify-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-2 text-sm font-semibold text-orange-700 hover:border-orange-300 hover:bg-orange-100 focus-visible:ring-2 focus-visible:ring-orange-500">{quantity > 0 ? quantity : null}<Plus size={16} aria-hidden="true" />{hasModifiers ? 'Choose' : 'Add'}</button>}
    </div>
    <ItemCustomizationDrawer isOpen={open} onClose={() => setOpen(false)} item={item} modifierGroups={modifierGroups} onAddToCart={addToCart} />
  </article>;
}
