"use client";

import { useCart } from '@/context/CartContext';
import { cartUnitPrice } from '@/lib/cart';
import { requestOrder } from '@/services/api';
import { Check, ChevronLeft, Loader2, Minus, Plus, QrCode, Receipt, ScanLine, Send, ShoppingBag } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import ReceiptModal from './ReceiptModal';
import CustomerFonepayCheckout from './CustomerFonepayCheckout';
import CustomerBillManager from './CustomerBillManager';
import OrderedBillItems from './OrderedBillItems';

const money = (amount: number) => new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 2 }).format(amount);

export default function FloatingCart({ onBrowse = () => {}, onScan = () => {} }: { onBrowse?: () => void; onScan?: () => void }) {
  const { cart, totalPrice, updateQuantity, updateNotes, session, clearCart, refreshSession, resetSession } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const paymentConfirmed = useCallback(async () => { await refreshSession(); }, [refreshSession]);
  useEffect(() => {
    if (!session?.qrToken) return;
    void refreshSession();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refreshSession(); }, 10000);
    return () => clearInterval(timer);
  }, [session?.qrToken, refreshSession]);
  const orderedTotal = Number(session?.activeOrderTotal || 0);
  const canOrder = session?.tableAccess?.access === 'approved';
  const ownBill = session?.tableAccess?.billing;
  const canPay = canOrder && ownBill?.can_pay === true;
  const checkout = async () => {
    if (!session || !canOrder || submittingRef.current || !cart.length) return;
    submittingRef.current = true; setSubmitting(true); setError(''); setSuccess(false);
    try {
      const response = await requestOrder(session.restaurantId, session.tableId, session.qrToken, cart.map(item => ({ menu_item_id: item.id, qty: item.quantity, notes: item.notes, modifiers: item.modifiers })));
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
    {canOrder && session?.qrToken && <CustomerBillManager key={session.qrToken} qrToken={session.qrToken} onChanged={refreshSession} onResumePayment={() => setPaymentOpen(true)} />}
    {success && <div role="status" className="mb-5 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900"><Check size={20} className="mt-0.5 shrink-0" /><div><p className="font-semibold">Request sent to the restaurant</p><p className="mt-1 text-sm">The team will review and accept your order before preparation starts.</p></div></div>}
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-5">
        {cart.length > 0 && <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5"><h3 className="mb-1 text-sm font-bold">Not sent yet</h3><div className="divide-y divide-stone-100">{cart.map(item => <article key={item.lineId} className="py-4"><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><h4 className="break-words text-sm font-semibold">{item.name}</h4>{Boolean(item.modifiers?.length) && <p className="mt-1 text-xs leading-5 text-stone-500">{item.modifiers?.map(modifier => modifier.modifier_name_snapshot).join(' · ')}</p>}<p className="mt-2 text-sm font-semibold">{money(cartUnitPrice(item) * item.quantity)}</p></div><div className="flex shrink-0 items-center rounded-xl border border-stone-200"><button type="button" disabled={submitting} onClick={() => updateQuantity(item.lineId, -1)} aria-label={`Decrease ${item.name} quantity`} className="grid h-11 w-11 place-items-center"><Minus size={16} /></button><span className="min-w-5 text-center text-sm font-semibold">{item.quantity}</span><button type="button" disabled={submitting} onClick={() => updateQuantity(item.lineId, 1)} aria-label={`Increase ${item.name} quantity`} className="grid h-11 w-11 place-items-center"><Plus size={16} /></button></div></div><label className="mt-3 block"><span className="sr-only">Instructions for {item.name}</span><input defaultValue={item.notes || ''} disabled={submitting} onBlur={event => updateNotes(item.lineId, event.target.value)} placeholder="Any special instructions?" maxLength={500} className="min-h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-base sm:text-sm outline-none focus:border-orange-400" /></label></article>)}</div></section>}
        {Boolean(session?.orderedItems?.length) && <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5"><div className="mb-2 flex items-center justify-between gap-3"><h3 className="text-sm font-bold">Sent to the restaurant</h3><button type="button" onClick={() => setReceiptOpen(true)} className="flex min-h-11 items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><Receipt size={16} aria-hidden="true" />Table estimate</button></div><OrderedBillItems items={session?.orderedItems || []} /></section>}
        {!cart.length && !session?.orderedItems?.length && <div className="rounded-2xl border border-stone-200 bg-white px-5 py-14 text-center"><ShoppingBag className="mx-auto h-9 w-9 text-stone-300" /><h3 className="mt-4 font-semibold">Your order is empty</h3><p className="mt-2 text-sm text-stone-500">Choose something from the menu to get started.</p><button type="button" onClick={onBrowse} className="mt-5 min-h-12 rounded-xl bg-orange-600 px-6 text-sm font-semibold text-white">Browse menu</button></div>}
      </div>
      {(cart.length > 0 || orderedTotal > 0) && <aside><div className="rounded-2xl border border-stone-200 bg-white p-4 lg:sticky lg:top-24">
        <h3 className="font-semibold">Table summary</h3>
        <dl className="mt-4 space-y-3 text-sm">
          {orderedTotal > 0 && <div className="flex justify-between"><dt className="text-stone-500">Table requests</dt><dd className="font-semibold">{money(orderedTotal)}</dd></div>}
          {cart.length > 0 && <div className="flex justify-between"><dt className="text-stone-500">Your private draft</dt><dd className="font-semibold">{money(totalPrice)}</dd></div>}
          <div className="flex justify-between border-t border-stone-100 pt-3"><dt className="font-semibold">Estimated total</dt><dd className="font-bold">{money(orderedTotal + totalPrice)}</dd></div>
        </dl>
        <p className="mt-3 text-xs leading-5 text-stone-500">Final taxes, discounts and charges are confirmed by the restaurant.</p>
        {ownBill && <div className="mt-4 rounded-xl border border-stone-200 p-3 text-sm"><h4 className="font-semibold">Your bill</h4><div className="mt-2 flex justify-between gap-3"><span className="text-stone-500">Accepted items</span><span>{money(ownBill.accepted_total)}</span></div>{ownBill.request_total > 0 && <div className="mt-2 flex justify-between gap-3"><span className="text-orange-700">Awaiting approval</span><span>{money(ownBill.request_total)}</span></div>}<p className="mt-2 text-xs leading-5 text-stone-500">The table estimate above includes everyone. Your payment covers only your own bill; the final remaining amount appears at checkout.</p></div>}
        {orderedTotal > 0 && canPay && <><button type="button" onClick={() => setPaymentOpen(true)} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-stone-950 text-sm font-semibold text-white hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><QrCode size={18} aria-hidden="true" />Pay your bill with Fonepay</button>{cart.length > 0 && <p className="mt-2 text-xs leading-5 text-stone-500">Your unsent draft is not included in this payment.</p>}</>}
        {orderedTotal > 0 && !canPay && <p className="mt-3 text-xs leading-5 text-stone-600">You can pay your own bill after your requests are accepted. Other guests’ bills are separate; staff can help with combined billing.</p>}
        {cart.length > 0 && (session ? <button type="button" onClick={() => void checkout()} disabled={submitting || !canOrder} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 text-sm font-semibold text-white hover:bg-orange-700 focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-60">{submitting ? <Loader2 aria-hidden="true" size={18} className="animate-spin motion-reduce:animate-none" /> : <Send aria-hidden="true" size={17} />}{submitting ? 'Sending request…' : canOrder ? 'Send order request' : 'Table approval required'}</button> : <button type="button" onClick={onScan} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 text-sm font-semibold text-white"><ScanLine size={18} />Scan table QR to order</button>)}
      </div></aside>}
    </div><ReceiptModal isOpen={receiptOpen} onClose={() => setReceiptOpen(false)} session={session} /><CustomerFonepayCheckout open={paymentOpen} qrToken={session?.qrToken || ''} onClose={() => setPaymentOpen(false)} onPaid={paymentConfirmed} />
  </div>;
}
