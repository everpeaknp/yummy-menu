"use client";

import Image from 'next/image';
import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { getImageUrl, MenuItem } from '@/services/api';
import ItemCustomizationDrawer from './ItemCustomizationDrawer';

export default function MenuItemCard({ item, modifierGroups = [] }: { item: MenuItem; modifierGroups?: any[]; restaurantId: string }) {
  const { addToCart, updateQuantity, cart } = useCart();
  const [open, setOpen] = useState(false);
  const hasModifiers = Boolean(item.modifier_group_ids?.length);
  const lines = cart.filter(line => line.id === item.id);
  const quantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const available = item.is_available !== false;
  const increment = () => { if (hasModifiers) setOpen(true); else addToCart(item); };
  return <article className={`flex min-w-0 gap-3 rounded-2xl border border-stone-200 bg-white p-3 sm:p-4 ${available ? '' : 'opacity-60'}`}>
    {item.image && <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-stone-100"><Image src={getImageUrl(item.image)!} alt={item.name} fill unoptimized sizes="96px" className="object-cover" /></div>}
    <div className="flex min-w-0 flex-1 flex-col"><h3 className="break-words text-sm font-semibold leading-5 sm:text-base">{item.name}</h3>{item.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">{item.description}</p>}{Boolean(item.dietary_info?.length) && <p className="mt-1 text-[11px] text-stone-500">{item.dietary_info?.join(' · ')}</p>}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3"><p className="text-sm font-bold">NPR {Number(item.price).toLocaleString('en-NP')}</p>{!available ? <span className="text-xs text-stone-500">Unavailable</span> : quantity > 0 && !hasModifiers ? <div className="flex items-center rounded-xl border border-orange-200 bg-orange-50"><button type="button" onClick={() => updateQuantity(lines[lines.length - 1].lineId, -1)} aria-label={`Decrease ${item.name} quantity`} className="grid h-11 w-11 place-items-center text-orange-700"><Minus size={16} /></button><span className="min-w-5 text-center text-sm font-semibold" aria-live="polite">{quantity}</span><button type="button" onClick={increment} aria-label={`Increase ${item.name} quantity`} className="grid h-11 w-11 place-items-center text-orange-700"><Plus size={16} /></button></div> : <button type="button" onClick={increment} aria-label={hasModifiers ? `Customize ${item.name}` : `Add ${item.name} to order`} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 text-xs font-semibold text-orange-700">{quantity > 0 ? quantity : null}<Plus size={16} />{hasModifiers ? 'Choose' : 'Add'}</button>}</div>
    </div><ItemCustomizationDrawer isOpen={open} onClose={() => setOpen(false)} item={item} modifierGroups={modifierGroups} onAddToCart={addToCart} />
  </article>;
}
