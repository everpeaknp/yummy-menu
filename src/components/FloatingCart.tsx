"use client";

import { useCart } from '@/context/CartContext';
import { cartUnitPrice } from '@/lib/cart';
import { requestOrder } from '@/services/api';
import { Check, ChevronLeft, Loader2, Minus, Plus, Receipt, ScanLine, Send, ShoppingBag } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReceiptModal from './ReceiptModal';
import { getTableActionLocation } from '@/lib/location';

const money = (amount: number) => new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 2 }).format(amount);
const statusLabels: Record<string, string> = { requested: 'Awaiting acceptance', pending: 'Accepted', preparing: 'Preparing', running: 'In progress', ready: 'Ready', scheduled: 'Scheduled', completed: 'Completed', cancelled: 'Cancelled' };

export default function FloatingCart({ onBrowse = () => {}, onScan = () => {} }: { onBrowse?: () => void; onScan?: () => void }) {
  const { cart, totalPrice, updateQuantity, updateNotes, session, clearCart, refreshSession, resetSession } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [receiptOpen, setReceiptOpen] = useState(false);
  useEffect(() => {
    if (!session?.qrToken) return;
    void refreshSession();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refreshSession(); }, 10000);
    return () => clearInterval(timer);
  }, [session?.qrToken, refreshSession]);
  const orderedTotal = Number(session?.activeOrderTotal || 0);
  const checkout = async () => {
    if (!session || submittingRef.current || !cart.length) return;
    submittingRef.current = true; setSubmitting(true); setError(''); setSuccess(false);
    try {
      const location = await getTableActionLocation();
      const response = await requestOrder(session.restaurantId, session.tableId, session.qrToken, cart.map(item => ({ menu_item_id: item.id, qty: item.quantity, notes: item.notes, modifiers: item.modifiers })), location);
      if (response.id || response.order?.id || response.restaurant_order_id) {
        clearCart(); setSuccess(true); await refreshSession();
      } else if (response.statusCode === 404 || response.statusCode === 410) {
        resetSession(); setError('This table QR has expired. Scan it again to send your saved draft.');
      } else {
        const detail = typeof response.detail === 'string' ? response.detail : 'Please try again.';
        setError(response.statusCode === 401 ? 'Sign in again to continue. Your draft is saved.' : `Could not send your order. ${detail}`);
      }
    } catch (requestError: any) {
      setError(requestError?.message || 'We could not confirm that you are at the restaurant.');
    } finally { submittingRef.current = false; setSubmitting(false); }
  };
  return <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:py-8">
    <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold">Your order</h2><button type="button" onClick={onBrowse} className="flex min-h-11 items-center gap-1 text-sm font-semibold text-orange-600"><ChevronLeft size={16} />Add dishes</button></div>
    {success && <div role="status" className="mb-5 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900"><Check size={20} className="mt-0.5 shrink-0" /><div><p className="font-semibold">Request sent to the restaurant</p><p className="mt-1 text-sm">The team will review and accept your order before preparation starts.</p></div></div>}
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-5">
        {cart.length > 0 && <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5"><h3 className="mb-1 text-sm font-bold">Not sent yet</h3><div className="divide-y divide-stone-100">{cart.map(item => <article key={item.lineId} className="py-4"><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><h4 className="break-words text-sm font-semibold">{item.name}</h4>{Boolean(item.modifiers?.length) && <p className="mt-1 text-xs leading-5 text-stone-500">{item.modifiers?.map(modifier => modifier.modifier_name_snapshot).join(' · ')}</p>}<p className="mt-2 text-sm font-semibold">{money(cartUnitPrice(item) * item.quantity)}</p></div><div className="flex shrink-0 items-center rounded-xl border border-stone-200"><button type="button" disabled={submitting} onClick={() => updateQuantity(item.lineId, -1)} aria-label={`Decrease ${item.name} quantity`} className="grid h-11 w-11 place-items-center"><Minus size={16} /></button><span className="min-w-5 text-center text-sm font-semibold">{item.quantity}</span><button type="button" disabled={submitting} onClick={() => updateQuantity(item.lineId, 1)} aria-label={`Increase ${item.name} quantity`} className="grid h-11 w-11 place-items-center"><Plus size={16} /></button></div></div><label className="mt-3 block"><span className="sr-only">Instructions for {item.name}</span><input defaultValue={item.notes || ''} disabled={submitting} onBlur={event => updateNotes(item.lineId, event.target.value)} placeholder="Any special instructions?" maxLength={500} className="min-h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-base sm:text-sm outline-none focus:border-orange-400" /></label></article>)}</div></section>}
        {Boolean(session?.orderedItems?.length) && <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5"><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-bold">Sent to the restaurant</h3><button type="button" onClick={() => setReceiptOpen(true)} className="flex min-h-11 items-center gap-1.5 text-xs font-semibold text-stone-500"><Receipt size={16} />Estimate</button></div><div className="divide-y divide-stone-100">{session?.orderedItems?.map(item => <article key={item.id} className="flex items-start gap-3 py-4"><span className="grid h-8 min-w-8 place-items-center rounded-lg bg-stone-100 text-xs font-semibold">{item.quantity}×</span><div className="min-w-0 flex-1"><h4 className="break-words text-sm font-semibold">{item.name}</h4><p className="mt-1 text-xs text-stone-500">{statusLabels[item.status] || item.status}</p>{item.notes && <p className="mt-1 text-xs text-stone-500">{item.notes}</p>}</div><p className="shrink-0 text-sm font-semibold">{money(Number(item.line_total ?? Number(item.unit_price || 0) * item.quantity))}</p></article>)}</div></section>}
        {!cart.length && !session?.orderedItems?.length && <div className="rounded-2xl border border-stone-200 bg-white px-5 py-14 text-center"><ShoppingBag className="mx-auto h-9 w-9 text-stone-300" /><h3 className="mt-4 font-semibold">Your order is empty</h3><p className="mt-2 text-sm text-stone-500">Choose something from the menu to get started.</p><button type="button" onClick={onBrowse} className="mt-5 min-h-12 rounded-xl bg-orange-600 px-6 text-sm font-semibold text-white">Browse menu</button></div>}
      </div>
      {(cart.length > 0 || orderedTotal > 0) && <aside><div className="rounded-2xl border border-stone-200 bg-white p-4 lg:sticky lg:top-24"><h3 className="font-semibold">Order summary</h3><dl className="mt-4 space-y-3 text-sm">{orderedTotal > 0 && <div className="flex justify-between"><dt className="text-stone-500">Already ordered</dt><dd className="font-semibold">{money(orderedTotal)}</dd></div>}{cart.length > 0 && <div className="flex justify-between"><dt className="text-stone-500">Your draft</dt><dd className="font-semibold">{money(totalPrice)}</dd></div>}<div className="flex justify-between border-t border-stone-100 pt-3"><dt className="font-semibold">Estimated total</dt><dd className="font-bold">{money(orderedTotal + totalPrice)}</dd></div></dl><p className="mt-3 text-xs leading-5 text-stone-500">Final taxes, discounts and charges are confirmed by the restaurant.</p>{cart.length > 0 && (session ? <button type="button" onClick={() => void checkout()} disabled={submitting} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">{submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={17} />}{submitting ? 'Sending request…' : 'Send order request'}</button> : <button type="button" onClick={onScan} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 text-sm font-semibold text-white"><ScanLine size={18} />Scan table QR to order</button>)}</div></aside>}
    </div><ReceiptModal isOpen={receiptOpen} onClose={() => setReceiptOpen(false)} session={session} />
  </div>;
}
