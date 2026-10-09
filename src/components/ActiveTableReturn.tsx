"use client";

import Link from 'next/link';
import { useEffect } from 'react';
import { ChevronRight, Utensils } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { slugify } from '@/config/restaurants';

export default function ActiveTableReturn() {
  const { session, sessionWarning, refreshSession } = useCart();
  useEffect(() => {
    void refreshSession();
    const refresh = () => { if (document.visibilityState === 'visible') void refreshSession(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [refreshSession]);
  if (!session) return null;
  const hasOrder = Boolean(session.activeOrderIds?.length || session.orderedItems?.length);
  const href = `/${session.restaurantId}/${slugify(session.restaurantName || 'restaurant')}?view=${hasOrder ? 'order' : 'menu'}`;
  return <aside aria-label="Connected table" className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
    <Link href={href} className="flex min-h-20 items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-orange-600"><Utensils size={19} aria-hidden="true" /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-stone-950">Back to your table</span><span className="mt-1 block truncate text-xs text-stone-600">{session.restaurantName} · Table {session.tableName}{hasOrder ? ' · Active order' : ''}</span></span>
      <ChevronRight size={18} className="shrink-0 text-orange-600" aria-hidden="true" />
    </Link>
    {sessionWarning && <p role="status" className="mt-2 text-xs text-amber-800">{sessionWarning}</p>}
  </aside>;
}
