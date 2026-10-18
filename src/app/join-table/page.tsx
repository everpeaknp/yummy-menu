"use client";

import { useState } from 'react';
import CustomerGate from '@/components/CustomerGate';
import { joinTableVisit } from '@/services/api';
import { slugify } from '@/config/restaurants';

export default function JoinTablePage() {
  return <CustomerGate><JoinTable /></CustomerGate>;
}

function JoinTable() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const join = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const token = decodeURIComponent(window.location.hash.slice(1));
      if (!token) throw new Error('Invitation missing. Ask your host for a new QR.');
      const context = await joinTableVisit(token);
      localStorage.setItem('yummy_qr_session', JSON.stringify({ restaurantId: context.restaurant_id,
        restaurantName: context.restaurant_name, tableId: context.table_id, tableName: context.table_name,
        qrToken: context.token, tableAccess: context.table_access, startTime: Date.now(), orderedItems: [], activeOrderIds: [] }));
      window.dispatchEvent(new Event('yummy_qr_session_updated'));
      window.location.replace(`/${context.restaurant_id}/${slugify(context.restaurant_name)}?view=menu`);
    } catch (e: any) { setError(e.response?.data?.detail || e.message || 'Could not join this table. Ask your host for help.'); }
    finally { setBusy(false); }
  };
  return <main className="mx-auto max-w-md px-5 py-12 text-stone-950"><h1 className="text-2xl font-bold">Join your friends</h1><p className="mt-3 leading-7 text-stone-600">Send a request to the table host. Once approved, you can see the table bill and send food requests.</p><button type="button" disabled={busy} onClick={join} className="mt-6 min-h-12 rounded-xl bg-orange-600 px-5 font-semibold text-white hover:bg-orange-700 focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50">{busy ? 'Requesting…' : 'Request to join table'}</button>{error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}</main>;
}
