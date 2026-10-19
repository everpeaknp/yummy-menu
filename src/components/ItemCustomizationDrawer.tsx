"use client";

import Image from 'next/image';
import { createPortal } from 'react-dom';
import { useState, useEffect, useId } from 'react';
import { MenuItem, getImageUrl } from '@/services/api';
import { X, Minus, Plus } from 'lucide-react';
import { useDialog } from '@/lib/useDialog';
import { money } from '@/lib/money';
import type { CartLine } from '@/lib/cart';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem | null;
  modifierGroups: any[];
  onAddToCart: (item: MenuItem, notes: string, modifiers: NonNullable<CartLine['modifiers']>) => void;
  initialNotes?: string;
  initialModifiers?: CartLine['modifiers'];
  editing?: boolean;
}

export default function ItemCustomizationDrawer({ isOpen, onClose, item, modifierGroups, onAddToCart, initialNotes = '', initialModifiers, editing = false }: Props) {
  const [selectedModifiers, setSelectedModifiers] = useState<Record<number, any[]>>({});
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const id = useId();
  const dialogRef = useDialog(isOpen, onClose, 'dish');
  useEffect(() => {
    if (!isOpen) return;
    const selected: Record<number, any[]> = {};
    for (const group of modifierGroups) selected[group.id] = (group.modifiers || []).filter((modifier: any) => initialModifiers?.some(value => value.modifier_id === modifier.id));
    setSelectedModifiers(selected); setNotes(initialNotes); setQuantity(1);
  }, [isOpen, item?.id, initialNotes, initialModifiers, modifierGroups]);
  if (!isOpen || !item) return null;
  const groups = modifierGroups.filter(group => item.modifier_group_ids?.includes(group.id)).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  const minimum = (group: any) => Math.max(group.min_selections || 0, group.is_required ? 1 : 0);
  const valid = item.is_available !== false && groups.every(group => (selectedModifiers[group.id] || []).length >= minimum(group) && (!group.max_selections || (selectedModifiers[group.id] || []).length <= group.max_selections));
  const toggle = (group: any, modifier: any) => setSelectedModifiers(previous => {
    const selected = previous[group.id] || [];
    if (group.max_selections === 1) return { ...previous, [group.id]: [modifier] };
    if (selected.some(value => value.id === modifier.id)) return { ...previous, [group.id]: selected.filter(value => value.id !== modifier.id) };
    if (group.max_selections && selected.length >= group.max_selections) return previous;
    return { ...previous, [group.id]: [...selected, modifier] };
  });
  const modifiers = Object.values(selectedModifiers).flat().filter(modifier => groups.some(group => group.modifiers?.some((value: any) => value.id === modifier.id)));
  const price = Number(item.price) + modifiers.reduce((sum, modifier) => sum + Number(modifier.price_adjustment || 0), 0);
  const confirm = () => {
    if (!valid) return;
    const snapshots = modifiers.map(modifier => ({ modifier_id: modifier.id, modifier_name_snapshot: modifier.name, price_adjustment_snapshot: Number(modifier.price_adjustment || 0) }));
    for (let index = 0; index < quantity; index++) onAddToCart(item, notes, snapshots);
    onClose();
  };
  return createPortal(<div className="fixed inset-0 z-[100] flex items-end justify-center bg-stone-950/45 sm:items-center sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} className="flex max-h-[94dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white sm:max-h-[90dvh] sm:rounded-3xl">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-stone-200 p-5"><div><h2 id={`${id}-title`} className="customer-section-title">{item.name}</h2><p className="mt-1 text-sm font-semibold text-stone-600">{money(Number(item.price))}</p></div><button type="button" aria-label="Close customization" onClick={onClose} className="customer-icon-button"><X size={20} aria-hidden="true" /></button></header>
      <div className="min-h-0 overflow-y-auto overscroll-contain p-5">
        {item.image && <div className="relative mb-5 aspect-[16/9] overflow-hidden rounded-2xl bg-stone-100"><Image src={getImageUrl(item.image)!} alt={item.name} fill unoptimized sizes="(max-width: 640px) 100vw, 520px" className="object-cover" /></div>}
        {item.description && <p className="mb-4 text-sm leading-6 text-stone-600">{item.description}</p>}
        {Boolean(item.dietary_info?.length) && <p className="mb-5 text-sm font-medium text-stone-600">{item.dietary_info?.join(' · ')}</p>}
        <div className="space-y-6">{groups.map(group => {
          const selected = selectedModifiers[group.id] || [];
          return <fieldset key={group.id}><legend className="font-semibold">{group.name}</legend><p id={`${id}-${group.id}-help`} className="mb-3 mt-1 text-sm text-stone-600">{minimum(group) > 0 ? `Choose at least ${minimum(group)}` : 'Optional'}{group.max_selections ? ` · up to ${group.max_selections}` : ''}</p><div className="space-y-2">{group.modifiers?.map((modifier: any) => {
            const checked = selected.some(value => value.id === modifier.id);
            const disabled = !checked && group.max_selections > 1 && selected.length >= group.max_selections;
            return <label key={modifier.id} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${checked ? 'border-orange-600 bg-orange-50' : 'border-stone-200'} ${disabled ? 'opacity-50' : ''}`}><input type={group.max_selections === 1 ? 'radio' : 'checkbox'} name={`${id}-group-${group.id}`} checked={checked} disabled={disabled} aria-describedby={`${id}-${group.id}-help`} onChange={() => toggle(group, modifier)} className="h-5 w-5 shrink-0 accent-orange-600" /><span className="min-w-0 flex-1 break-words font-medium">{modifier.name}</span>{Number(modifier.price_adjustment) !== 0 && <span className="shrink-0 tabular-nums">{Number(modifier.price_adjustment) > 0 ? '+' : ''}{money(Number(modifier.price_adjustment))}</span>}</label>;
          })}</div></fieldset>;
        })}</div>
        <label className="mt-6 block text-sm font-semibold">Special instructions <span className="font-normal text-stone-600">(optional)</span><textarea name="dish-instructions" maxLength={500} placeholder="For example, no onions…" value={notes} onChange={event => setNotes(event.target.value)} rows={2} className="profile-input mt-3 resize-y py-3 font-normal" /></label>
      </div>
      <footer className="shrink-0 border-t border-stone-200 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {!editing && <div className="mb-4 flex items-center justify-between"><span className="text-sm font-semibold">Quantity</span><div className="flex items-center rounded-xl border border-stone-300"><button type="button" disabled={quantity <= 1} aria-label="Decrease quantity" onClick={() => setQuantity(value => value - 1)} className="customer-icon-button"><Minus size={17} /></button><span className="min-w-8 text-center font-semibold">{quantity}</span><button type="button" aria-label="Increase quantity" onClick={() => setQuantity(value => value + 1)} className="customer-icon-button"><Plus size={17} /></button></div></div>}
        {!valid && <p className="mb-3 text-sm text-orange-800">{item.is_available === false ? 'This dish is currently unavailable.' : 'Complete the required choices to continue.'}</p>}
        <button type="button" onClick={confirm} disabled={!valid} className="customer-primary-button flex w-full justify-between"><span>{editing ? 'Save choices' : 'Add to cart'}</span><span className="tabular-nums">{editing ? `${money(price)} each` : money(price * quantity)}</span></button>
      </footer>
    </div>
  </div>, document.body);
}
