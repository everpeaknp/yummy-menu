"use client";

import { useCart } from '@/context/CartContext';
import { cartUnitPrice, CartLine } from '@/lib/cart';
import { requestOrder, getGroupedMenu, getModifierGroups } from '@/services/api';
import { ArrowLeft, ChevronRight, Clock3, Loader2, Minus, Plus, QrCode, Receipt, ScanLine, Send, ShoppingBag, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { money } from '@/lib/money';
import ReceiptModal from './ReceiptModal';
import CustomerFonepayCheckout from './CustomerFonepayCheckout';
import CustomerBillManager from './CustomerBillManager';
import OrderedBillItems from './OrderedBillItems';
import ItemCustomizationDrawer from './ItemCustomizationDrawer';

type Props = { pendingBills?: number; mode?: 'cart' | 'orders'; onBrowse?: () => void; onScan?: () => void; onCart?: () => void; onTable?: () => void; onSubmitted?: () => void };
export default function FloatingCart({ pendingBills = 0, mode = 'orders', onBrowse = () => {}, onScan = () => {}, onCart = () => {}, onTable = () => {}, onSubmitted = () => {} }: Props) {
  const { cart, totalPrice, totalItems, updateQuantity, updateConfiguration, removeFromCart, session, clearCart, refreshSession, resetSession } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [panel, setPanel] = useState<'sent' | 'bill'>('sent');
  const [editing, setEditing] = useState<CartLine | null>(null);
  const paymentConfirmed = useCallback(async () => { await refreshSession(); }, [refreshSession]);
  const billsChanged = useCallback(async () => { await refreshSession(); if (session?.qrToken) void mutate(['bill-activity', session.qrToken]); }, [refreshSession, session?.qrToken]);
  const refreshBillAccess = useCallback(() => refreshSession(true), [refreshSession]);
  const cartRestaurantId = session?.restaurantId || cart[0]?.restaurantId;
  const { data: menuData, error: menuError, mutate: reloadMenu } = useSWR(mode === 'cart' && cartRestaurantId ? `customer-menu-${cartRestaurantId}` : null, async () => {
    const [categories, modifierGroups] = await Promise.all([getGroupedMenu(String(cartRestaurantId)), getModifierGroups(String(cartRestaurantId))]);
    return { categories, modifierGroups };
  });
  useEffect(() => {
    const sync = () => { const query = new URLSearchParams(window.location.search); setPanel(query.get('panel') === 'bill' ? 'bill' : 'sent'); setPaymentOpen(query.get('checkout') === '1'); };
    sync(); window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  useEffect(() => {
    if (!session?.qrToken) return;
    void refreshSession();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refreshSession(); }, 10000);
    return () => clearInterval(timer);
  }, [session?.qrToken, refreshSession]);
  useEffect(() => { if (!success) return; const timer = setTimeout(() => setSuccess(false), 5000); return () => clearTimeout(timer); }, [success]);
  const selectPanel = (next: 'sent' | 'bill') => {
    setPanel(next); const url = new URL(window.location.href); url.searchParams.set('panel', next); window.history.pushState({}, '', url);
  };
  const openPayment = () => {
    const url = new URL(window.location.href); url.searchParams.set('checkout', '1'); window.history.pushState({}, '', url); setPaymentOpen(true);
  };
  const hidePayment = () => {
    setPaymentOpen(false);
    if (new URLSearchParams(window.location.search).get('checkout') === '1') window.history.back();
  };
  const canOrder = session?.tableAccess?.access === 'approved';
  const ownBill = session?.tableAccess?.billing;
  const canPay = canOrder && ownBill?.can_pay === true;
  const ownItems = (session?.orderedItems || []).filter(item => item.is_yours === true);
  const pending = ownItems.filter(item => item.status === 'requested');
  const editingItem = editing && (menuData?.categories.flatMap(category => category.items).find(item => item.id === editing.id) || editing);
  const checkout = async () => {
    if (!session || !canOrder || submittingRef.current || !cart.length) return;
    submittingRef.current = true; setSubmitting(true); setError(''); setSuccess(false);
    try {
      const response = await requestOrder(session.restaurantId, session.tableId, session.qrToken, cart.map(item => ({ menu_item_id: item.id, qty: item.quantity, notes: item.notes, modifiers: item.modifiers })));
      if (response.id || response.order?.id || response.restaurant_order_id) {
        clearCart(); setSuccess(true); setPanel('sent'); await refreshSession(); onSubmitted();
      } else if (response.statusCode === 404 || response.statusCode === 410) {
        resetSession(); setError('This table QR has expired. Scan it again to send your saved draft.');
      } else {
        const detail = typeof response.detail === 'string' ? response.detail : 'Please try again.';
        setError(response.statusCode === 401 ? 'Sign in again to continue. Your draft is saved.' : `Could not send your order. ${detail}`);
      }
    } catch (requestError: any) { setError(requestError?.message || 'Could not send your order. Your draft is saved.'); }
    finally { submittingRef.current = false; setSubmitting(false); }
  };
  const sendOrderButton = <button type="button" onClick={() => void checkout()} disabled={submitting || !canOrder} className="customer-primary-button w-full"><span>{submitting ? <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}</span>{submitting ? 'Sending…' : 'Send order request'}</button>;
  const payBillButton = <button type="button" onClick={openPayment} className="customer-primary-button w-full"><QrCode size={18} aria-hidden="true" />Review Fonepay payment<ChevronRight size={18} aria-hidden="true" /></button>;
  const paymentSummary = <section className="customer-card p-5 sm:p-6"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-stone-600">Your accepted bill</p><button type="button" onClick={() => setReceiptOpen(true)} disabled={!session?.orderedItems?.length} className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-orange-700 hover:text-orange-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50"><Receipt size={16} aria-hidden="true" />Table estimate</button></div><p className="mt-1 break-words font-display text-3xl font-semibold tabular-nums">{ownBill ? money(ownBill.accepted_total) : 'Not available yet'}</p><p className="mt-3 text-sm leading-6 text-stone-600">Your items only. The exact remaining amount, including charges, discounts and previous payments, is confirmed at checkout.</p>{Boolean(ownBill?.request_total) && <div className="mt-4 flex justify-between gap-3 border-t border-stone-200 pt-4 text-sm text-orange-800"><span>Awaiting restaurant approval</span><span className="shrink-0 font-semibold">{money(ownBill!.request_total)}</span></div>}{canPay ? <div className="mt-5 hidden xl:block">{payBillButton}</div> : <p className="mt-5 rounded-xl bg-stone-50 p-3 text-sm leading-6 text-stone-600">{pending.length ? 'The restaurant must accept your food requests before you can pay.' : 'Online payment unlocks for an eligible accepted bill. Pending bill requests or multiple bills may need your attention below or help from staff.'}</p>}{cart.length > 0 && <p className="mt-3 text-xs leading-5 text-stone-600">Your unsent cart is not included in payment.</p>}<button type="button" onClick={onTable} className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-orange-700">Table & service help<ChevronRight size={16} /></button></section>;
  return <div className={`experience-width py-5 sm:py-8 ${mode === 'cart' ? 'pb-48 xl:pb-10' : panel === 'bill' && canPay ? 'pb-36 xl:pb-10' : ''}`}>
    <div className="mb-6 flex items-center justify-between gap-4"><div>{mode === 'cart' && <button type="button" disabled={submitting} onClick={onBrowse} className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-stone-600"><ArrowLeft size={17} />Back to menu</button>}<h2 className="customer-page-title">{mode === 'cart' ? 'Review your cart' : 'Your orders'}</h2><p className="mt-2 text-sm text-stone-600">{session ? `Table ${session.tableName}` : 'Connect to a table when you are ready.'}{mode === 'cart' ? ' · Not sent yet' : ' · This visit'}</p></div>{mode !== 'cart' && <button type="button" onClick={onBrowse} className="customer-secondary-button">Add food<Plus size={17} /></button>}</div>
    {success && <p role="status" className="mb-5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">Request sent to the restaurant. Waiting for acceptance.</p>}
    {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {mode === 'cart' ? <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="customer-card"><div className="flex items-center justify-between border-b border-stone-200 p-5"><h3 className="font-semibold">Your food</h3><span className="text-sm text-stone-600">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span></div>{cart.length ? <ul className="divide-y divide-stone-200">{cart.map(item => <li key={item.lineId} className="p-5"><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><h4 className="break-words font-semibold">{item.name}</h4>{Boolean(item.modifiers?.length) && <p className="mt-1 text-sm leading-6 text-stone-600">{item.modifiers?.map(modifier => modifier.modifier_name_snapshot).join(', ')}</p>}{item.notes && <p className="mt-1 break-words text-sm leading-6 text-stone-600">Note: {item.notes}</p>}<p className="mt-3 text-sm font-semibold tabular-nums">{money(cartUnitPrice(item) * item.quantity)}</p></div><button type="button" disabled={submitting} onClick={() => removeFromCart(item.lineId)} aria-label={`Remove ${item.name}`} className="customer-icon-button text-stone-500"><Trash2 size={17} /></button></div><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={submitting || !menuData} onClick={() => setEditing(item)} className="min-h-11 text-sm font-semibold text-orange-700 disabled:opacity-50">Edit choices & note</button><div className="flex items-center rounded-xl border border-stone-300"><button type="button" disabled={submitting} onClick={() => updateQuantity(item.lineId, -1)} aria-label={`Decrease ${item.name} quantity`} className="customer-icon-button"><Minus size={16} /></button><span className="min-w-7 text-center text-sm font-semibold">{item.quantity}</span><button type="button" disabled={submitting} onClick={() => updateQuantity(item.lineId, 1)} aria-label={`Increase ${item.name} quantity`} className="customer-icon-button"><Plus size={16} /></button></div></div></li>)}</ul> : <div className="p-8 text-center"><ShoppingBag size={30} className="mx-auto text-stone-300" /><h3 className="mt-4 font-semibold">Your cart is empty</h3><p className="mt-2 text-sm text-stone-600">Find something good on the menu.</p><button type="button" onClick={onBrowse} className="customer-primary-button mt-5">Browse menu</button></div>}{menuError && <div role="alert" className="border-t border-stone-200 p-5 text-sm text-red-700">Could not load current choices. <button type="button" onClick={() => void reloadMenu()} className="min-h-11 font-semibold underline">Retry</button></div>}</section>
      {cart.length > 0 && <aside className="xl:sticky xl:top-24"><section className="customer-card mb-5 p-5"><h3 className="font-semibold">Before you send</h3><p className="mt-3 text-sm leading-6 text-stone-600">This cart is private. The restaurant reviews your request before preparation starts.</p>{!canOrder && session && <div className="mt-4 rounded-xl bg-orange-50 p-3 text-sm leading-6 text-orange-900">Your table must be approved before you can send food requests.<button type="button" onClick={onTable} className="mt-2 flex min-h-11 items-center gap-1 font-semibold">Check table access<ChevronRight size={16} /></button></div>}</section><div data-mobile-order-actions role="group" aria-label="Order actions" className="customer-action-dock"><div className="mx-auto max-w-xl"><div className="mb-3 flex justify-between text-sm font-semibold"><span>Cart estimate</span><span className="tabular-nums">{money(totalPrice)}</span></div>{session ? sendOrderButton : <button type="button" onClick={onScan} className="customer-primary-button w-full"><ScanLine size={18} />Scan table QR to order</button>}<p className="mt-3 text-xs leading-5 text-stone-600">Final taxes, discounts and charges are confirmed by the restaurant.</p></div></div></aside>}
      {editing && <ItemCustomizationDrawer isOpen onClose={() => setEditing(null)} item={editingItem} modifierGroups={menuData?.modifierGroups || []} initialNotes={editing.notes} initialModifiers={editing.modifiers} editing onAddToCart={(item, notes, modifiers) => updateConfiguration(editing.lineId, item, notes, modifiers)} />}
    </div> : <>
      {cart.length > 0 && <button type="button" onClick={onCart} className="customer-card mb-5 flex w-full items-center gap-3 p-4 text-left hover:border-orange-300"><ShoppingBag size={20} className="text-orange-600" aria-hidden="true" /><span className="flex-1"><span className="block text-sm font-semibold">{totalItems} items not sent</span><span className="mt-1 block text-sm text-stone-600">Review your cart before sending another round.</span></span><ChevronRight size={20} aria-hidden="true" /></button>}
      <nav aria-label="Order views" className="mb-6 flex gap-1 border-b border-stone-200">{([{ id: 'sent', label: 'Sent' }, { id: 'bill', label: 'Your bill' }] as const).map(tab => <a key={tab.id} href={`?view=order&panel=${tab.id}`} aria-current={panel === tab.id ? 'page' : undefined} onClick={event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); selectPanel(tab.id); }} className={`min-h-12 border-b-2 px-5 py-3 text-sm font-semibold ${panel === tab.id ? 'border-orange-600 text-orange-700' : 'border-transparent text-stone-600'}`}>{tab.label}{tab.id === 'bill' && pendingBills > 0 ? ` (${pendingBills})` : ''}</a>)}</nav>
      {panel === 'sent' ? <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]"><section className="customer-card p-5 sm:p-6"><div className="mb-5 flex items-center gap-2"><Clock3 size={19} className="text-orange-600" aria-hidden="true" /><h3 className="customer-section-title">Sent to the restaurant</h3></div>{ownItems.length ? <OrderedBillItems items={ownItems} /> : <div className="py-8"><h4 className="font-semibold">No items on your bill yet</h4><p className="mt-2 text-sm leading-6 text-stone-600">Your submitted items appear here. Food assigned or combined with someone else&apos;s bill can be found under Table.</p><button type="button" onClick={onBrowse} className="customer-primary-button mt-5">Browse menu</button></div>}</section><aside className="customer-card p-5"><h3 className="font-semibold">Your bill stays yours</h3><p className="mt-3 text-sm leading-6 text-stone-600">See your accepted items, review cost-sharing requests, and pay when your bill is ready.</p><button type="button" onClick={() => selectPanel('bill')} className="customer-secondary-button mt-5 w-full">View your bill<ChevronRight size={17} /></button><button type="button" onClick={onTable} className="mt-3 min-h-11 text-sm font-semibold text-orange-700">See the table order</button></aside></div> : <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]"><section className="customer-card p-4 sm:p-5"><h3 className="customer-section-title">Items on your bill</h3><div className="mt-3"><OrderedBillItems items={ownItems} /></div>{canOrder && session?.qrToken && <CustomerBillManager key={session.qrToken} qrToken={session.qrToken} onChanged={billsChanged} onRefreshAccess={refreshBillAccess} onResumePayment={openPayment} />}</section><aside className="xl:sticky xl:top-36">{paymentSummary}</aside>{canPay && <div data-mobile-payment-action className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t border-stone-200 bg-white p-3 xl:hidden"><div className="mx-auto max-w-xl">{payBillButton}</div></div>}</div>}
    </>}
    <ReceiptModal isOpen={receiptOpen} onClose={() => setReceiptOpen(false)} session={session} />
    <CustomerFonepayCheckout open={paymentOpen} qrToken={session?.qrToken || ''} onClose={hidePayment} onPaid={paymentConfirmed} />
  </div>;
}
