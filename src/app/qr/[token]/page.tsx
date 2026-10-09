"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ScanLine } from 'lucide-react';
import { setBaseUrl, verifyQRToken } from '@/services/api';
import { slugify } from '@/config/restaurants';

export default function QRVerifyPage() {
  const { token } = useParams();
  const router = useRouter();
  const [error, setError] = useState('');
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const verify = async () => {
      try {
        // A previously visited local POS must not capture a new restaurant's scan.
        setBaseUrl(process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001');
        const context = await verifyQRToken(String(token));
        if (!context || cancelled) return;
        localStorage.setItem('yummy_pos_mode', 'cloud');
        if (context.local_pos_ip) {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 1200);
          try {
            const localUrl = `http://${context.local_pos_ip}:8001`;
            const response = await fetch(`${localUrl}/qr/verify/${encodeURIComponent(String(token))}`, {
              signal: controller.signal,
            });
            if (cancelled) return;
            if (response.ok) {
              setBaseUrl(localUrl);
              localStorage.setItem('yummy_pos_mode', 'local');
            }
          } catch {
            // Cloud remains available when the restaurant's local POS is unreachable.
          } finally {
            clearTimeout(timeout);
          }
        }
        if (cancelled) return;
        localStorage.setItem('yummy_qr_session', JSON.stringify({
          restaurantId: context.restaurant_id, restaurantName: context.restaurant_name,
          tableId: context.table_id, tableName: context.table_name, qrToken: context.token,
          orderedItems: context.ordered_items || [], activeOrderIds: (context.active_orders || []).map(order => order.id),
          activeOrderTotal: (context.active_orders || []).reduce((sum, order) => sum + Number(order.grand_total ?? order.total ?? 0), 0), startTime: Date.now(),
        }));
        window.dispatchEvent(new Event('yummy_qr_session_updated'));
        router.replace(`/${context.restaurant_id}/${slugify(context.restaurant_name || 'restaurant')}?view=menu`);
      } catch (requestError: any) {
        if (cancelled) return;
        setError([404, 410].includes(requestError.response?.status) ? 'This QR code is invalid or expired. Please ask the restaurant team for help.' : 'Could not connect to this table. Check your connection and try again.');
      }
    };
    void verify();
    return () => { cancelled = true; };
  }, [token, router]);
  return <main className="grid min-h-[100dvh] place-items-center bg-stone-50 p-5"><section className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 text-center">{error ? <><ScanLine className="mx-auto h-9 w-9 text-orange-600" /><h1 className="mt-5 text-xl font-bold">Could not open this table</h1><p role="alert" className="mt-3 text-sm leading-6 text-stone-500">{error}</p><button type="button" onClick={() => window.location.reload()} className="mt-5 min-h-12 w-full rounded-xl bg-orange-600 text-sm font-semibold text-white">Try again</button></> : <><Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-600" /><h1 className="mt-5 text-lg font-bold">Connecting to your table</h1><p role="status" className="mt-2 text-sm text-stone-500">Your menu will open in a moment.</p></>}</section></main>;
}
