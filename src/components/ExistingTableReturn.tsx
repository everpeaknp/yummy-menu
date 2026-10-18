"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Utensils } from 'lucide-react';
import { getMyActiveTable, QRTableContext } from '@/services/api';

export default function ExistingTableReturn({ restaurantId, currentTableId }: { restaurantId: number; currentTableId: number }) {
  const [activeTable, setActiveTable] = useState<QRTableContext | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getMyActiveTable(restaurantId).then(table => {
      if (!cancelled && table && table.restaurant_id === restaurantId && table.table_id !== currentTableId && table.token) {
        setActiveTable(table);
      }
    }).catch(() => {
      // This is an optional recovery hint; the menu remains usable if the lookup is unavailable.
    });
    return () => { cancelled = true; };
  }, [restaurantId, currentTableId]);

  if (!activeTable) return null;

  return <aside aria-label="Your active table" className="mx-auto my-3 max-w-7xl px-4 sm:px-6">
    <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-3 sm:px-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-orange-600"><Utensils size={18} aria-hidden="true" /></span>
      <p className="min-w-0 flex-1 text-sm text-stone-700">You’re already at <strong className="font-semibold text-stone-950">Table {activeTable.table_name}</strong></p>
      <Link href={`/qr/${encodeURIComponent(activeTable.token)}`} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-orange-700 hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 sm:px-3">
        <ArrowLeft size={16} aria-hidden="true" />Return
      </Link>
    </div>
  </aside>;
}
