"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRightLeft, Check, Merge, Receipt, X } from 'lucide-react';
import { useDialog } from '@/lib/useDialog';
import { getCustomerBills, proposeCustomerBill, decideCustomerBill, getStoredCustomerToken } from '@/services/api';
import type { CustomerBillOverview, CustomerBillRequest } from '@/services/api';

const money = (amount: number) => new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 2 }).format(amount);
const button = 'inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
const primary = `${button} border-orange-600 bg-orange-600 text-white hover:bg-orange-700`;
export const customerBillErrorText = (error: any) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  const message = error?.response?.data?.message;
  if (typeof message === 'string' && message.trim()) return message;
  if (typeof error?.response?.status === 'number') {
    const status = error.response.status;
    const statusText = typeof error.response.statusText === 'string' ? error.response.statusText : '';
    return `Bill service returned HTTP ${status}${statusText ? ` (${statusText})` : ''}. Refresh and try again.`;
  }
  if (error?.request || error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
    return 'Could not reach the bill service. Check the API connection and try again.';
  }
  return 'Could not load your bill options. Refresh and try again.';
};
export const shouldRefreshTableAccessAfterBillFailure = (error: any) => error?.response?.status === 410;
const states: Record<CustomerBillRequest['status'], string> = { pending: 'Waiting for consent', accepted: 'Accepted', rejected: 'Declined', canceled: 'Canceled', expired: 'Expired', stale: 'Bill changed — send a new request' };

export default function CustomerBillManager({ qrToken, onChanged, onRefreshAccess, onResumePayment }: { qrToken: string; onChanged: () => Promise<void>; onRefreshAccess: () => Promise<void>; onResumePayment?: () => void }) {
  const [data, setData] = useState<CustomerBillOverview | null>(null);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<'merge' | 'transfer'>('transfer');
  const [recipient, setRecipient] = useState<number | null>(null);
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const version = useRef(0);
  const accessRefreshAttempted = useRef(false);
  const invalidate = useCallback(() => { ++version.current; }, []);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dialog = useDialog(open, () => { if (!inFlight.current) setOpen(false); });
  const refresh = useCallback(async () => {
    const current = ++version.current;
    const token = getStoredCustomerToken();
    try {
      const value = await getCustomerBills(qrToken);
      if (current === version.current && getStoredCustomerToken() === token) { accessRefreshAttempted.current = false; setData(value); setError(''); }
    } catch (error) {
      if (current === version.current) {
        setError(customerBillErrorText(error));
        if (shouldRefreshTableAccessAfterBillFailure(error) && !accessRefreshAttempted.current) {
          accessRefreshAttempted.current = true;
          await onRefreshAccess();
        }
      }
    }
  }, [qrToken, onRefreshAccess]);
  useEffect(() => {
    setData(null); setOpen(false); setNotice(''); setError(''); setRecipient(null); setQuantities({}); accessRefreshAttempted.current = false;
    void refresh();
    const timer = setInterval(() => { if (document.visibilityState === 'visible' && !inFlight.current && !accessRefreshAttempted.current) void refresh(); }, 5000);
    return () => { invalidate(); clearInterval(timer); };
  }, [refresh, invalidate]);
  const run = async (task: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); setNotice('');
    const token = getStoredCustomerToken();
    try { await task(); if (getStoredCustomerToken() === token) { await refresh(); await onChanged(); } }
    catch (error) { setError(customerBillErrorText(error)); }
    finally { inFlight.current = false; setBusy(false); }
  };
  const incoming = data?.requests.filter(request => request.incoming && request.status === 'pending') || [];
  const mergedIntoHost = !data?.own_bill && !data?.blocked_reason && data?.requests.some(request => !request.incoming && request.kind === 'merge' && request.status === 'accepted');
  const outgoing = data?.requests.some(request => !request.incoming && request.status === 'pending');
  const friends = data?.friends.filter(friend => kind === 'transfer' || friend.is_host) || [];
  const lines = (data?.own_bill?.items || []).map(item => ({ order_item_id: item.id, qty: Number(quantities[item.id] || 0) })).filter(line => line.qty > 0);
  const validLines = lines.length > 0 && (data?.own_bill?.items || []).every(item => {
    const qty = Number(quantities[item.id] || 0);
    return Number.isInteger(qty) && qty >= 0 && qty <= item.qty;
  });
  const validRecipient = friends.some(friend => friend.account_id === recipient);
  const canSubmit = !!data?.own_bill && !data.blocked_reason && !outgoing && validRecipient && (kind === 'merge' || validLines);
  const send = () => void run(async () => {
    if (!canSubmit || recipient === null) return;
    await proposeCustomerBill(qrToken, { kind, recipient_account_id: recipient, lines: kind === 'merge' ? [] : lines });
    setOpen(false); setQuantities({}); setRecipient(null);
    setNotice('Request sent. Your bill changes only after your friend accepts.');
  });
  const decide = (request: CustomerBillRequest, action: 'accept' | 'reject' | 'cancel') => void run(async () => {
    const result = await decideCustomerBill(qrToken, request.id, action);
    setNotice(result.status === 'accepted' ? 'Bill updated. No new kitchen order was sent.' : states[result.status]);
  });

  return <section aria-label="Manage your bill" className="mb-5 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 font-semibold"><Receipt size={18} aria-hidden="true" />Your bill, your choice</h3><p className="mt-1 text-xs leading-5 text-stone-500">Keep separate bills, assign shared dishes, or ask the host to pay together.</p></div>
      <button type="button" className={button} disabled={busy || !data} onClick={() => setOpen(true)}>Manage bill{incoming.length > 0 ? ` (${incoming.length})` : ''}</button></div>
    {notice && <p role="status" className="mt-3 text-sm text-green-800">{notice}</p>}
    {!data && !error && <p role="status" className="mt-3 text-xs text-stone-500">Loading bill options…</p>}
    {mergedIntoHost && <p className="mt-3 text-sm leading-6 text-stone-600">Your previous bill is combined with the host’s bill. The host pays that combined bill; new orders you place will have their own bill.</p>}
    {error && !open && <div role="alert" className="mt-3 text-sm text-red-700">{error}<button type="button" className={`${button} ml-2`} disabled={busy} onClick={() => { accessRefreshAttempted.current = false; void refresh(); }}>Retry</button></div>}
    {incoming.length > 0 && <div className="mt-4 space-y-4 border-t border-stone-100 pt-4">
      <h4 className="text-sm font-semibold">Friends need your approval</h4>
      {incoming.map(request => <article key={request.id} className="border-b border-stone-100 pb-4 last:border-0 last:pb-0">
        <p className="break-words text-sm font-semibold">{request.from_name} {request.kind === 'merge' ? 'wants to combine their bill with yours' : 'wants to assign items to your bill'}</p>
        <ul className="mt-2 space-y-1 text-sm text-stone-600">{request.items.map((item, index) => <li key={index} className="break-words">{item.qty}× {item.name}{item.modifiers.length ? ` · ${item.modifiers.join(', ')}` : ''}{item.notes ? ` · ${item.notes}` : ''}</li>)}</ul>
        <p className="mt-2 text-sm font-semibold tabular-nums">{money(request.amount)} <span className="font-normal text-stone-500">estimated addition</span></p>
        <p className="mt-2 text-xs leading-5 text-stone-500">Accepting adds these charges to your bill. {request.kind === 'merge' ? 'You remain the billing customer and the host pays the combined bill. Staff must help reverse an accepted merge.' : 'You can pay your bill separately.'}</p>
        <div className="mt-3 flex flex-wrap gap-2"><button type="button" className={button} disabled={busy} onClick={() => decide(request, 'reject')}>Decline</button><button type="button" className={primary} disabled={busy} onClick={() => decide(request, 'accept')}><Check size={16} aria-hidden="true" />Accept charges</button></div>
      </article>)}
    </div>}
    {open && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="manage-bill-title" aria-describedby="manage-bill-description" className="max-h-[92dvh] w-full max-w-xl overflow-y-auto overscroll-contain rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl sm:p-6">
        <div className="flex items-start justify-between gap-3"><h2 id="manage-bill-title" className="text-xl font-bold">Manage your bill</h2><button type="button" disabled={busy} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-orange-500" aria-label="Close bill management" onClick={() => setOpen(false)}><X size={20} aria-hidden="true" /></button></div>
        <p id="manage-bill-description" className="mt-1 text-sm leading-6 text-stone-500">Nothing moves until your friend accepts. Each person can pay separately; whole bills combine into the host’s bill.</p>
        {data?.blocked_reason && <p className="mt-4 rounded-xl bg-orange-50 p-3 text-sm text-orange-900">{data.blocked_reason}</p>}
        {data?.blocked_reason?.includes('payment checkout') && onResumePayment && <button type="button" className={`${button} mt-3`} onClick={() => { setOpen(false); onResumePayment(); }}>Resume payment checkout</button>}
        {!data?.own_bill && !data?.blocked_reason && <p className="mt-4 text-sm text-stone-600">You do not have an accepted bill yet. You can still receive items assigned by a friend.</p>}
        {data?.own_bill && <div className="mt-5 space-y-4">
          <p className="flex justify-between text-sm"><span className="text-stone-500">Your accepted bill</span><strong className="tabular-nums">{money(data.own_bill.total)}</strong></p>
          <div className="grid grid-cols-2 gap-2" aria-label="Bill action"><button type="button" disabled={busy} aria-pressed={kind === 'transfer'} className={`${button} ${kind === 'transfer' ? 'border-orange-600 bg-orange-50 text-orange-800' : ''}`} onClick={() => { setKind('transfer'); setRecipient(null); }}><ArrowRightLeft size={16} aria-hidden="true" />Split / assign items</button><button type="button" disabled={busy} aria-pressed={kind === 'merge'} className={`${button} ${kind === 'merge' ? 'border-orange-600 bg-orange-50 text-orange-800' : ''}`} onClick={() => { setKind('merge'); setRecipient(null); }}><Merge size={16} aria-hidden="true" />Combine with host</button></div>
          <fieldset disabled={busy}><legend className="mb-2 text-sm font-semibold">{kind === 'merge' ? 'Send to the host' : 'Choose a friend'}</legend><div className="grid gap-2 sm:grid-cols-2">{friends.map(friend => <label key={friend.account_id} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${recipient === friend.account_id ? 'border-orange-600 bg-orange-50' : 'border-stone-200'}`}><input type="radio" name="bill-recipient" value={friend.account_id} checked={recipient === friend.account_id} onChange={() => setRecipient(friend.account_id)} className="accent-orange-600" /><span className="min-w-0 break-words">{friend.name}{friend.is_host ? ' · Host' : ''}</span></label>)}</div>{!friends.length && <p className="text-sm text-stone-500">{data.is_host && kind === 'merge' ? 'Friends can send their bills to you. Review their incoming requests on the Order screen.' : 'Ask your friend to join and get approved at this table first.'}</p>}</fieldset>
          {kind === 'transfer' && <fieldset disabled={busy}><legend className="text-sm font-semibold">Choose item quantities</legend><div className="mt-2 divide-y divide-stone-100">{data.own_bill.items.map(item => <label key={item.id} className="flex items-center gap-3 py-3"><span className="min-w-0 flex-1"><span className="block break-words text-sm font-medium">{item.name}</span><span className="block break-words text-xs text-stone-500">{item.qty} available · {money(item.total)}{item.modifiers.length ? ` · ${item.modifiers.join(', ')}` : ''}{item.notes ? ` · ${item.notes}` : ''}</span></span><input type="number" inputMode="numeric" min={0} max={item.qty} step={1} value={quantities[item.id] || ''} onChange={event => setQuantities(values => ({ ...values, [item.id]: event.target.value }))} aria-label={`Assign quantity of ${item.name}`} className="min-h-11 w-20 rounded-xl border border-stone-200 px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" /></label>)}</div></fieldset>}
          {kind === 'merge' && <p className="rounded-xl bg-stone-50 p-3 text-sm leading-6">Your whole accepted bill moves to the host after approval. The host becomes the billing customer; your original customer details remain in the audit history. Only the host can pay that combined bill.</p>}
          {outgoing && <p className="text-sm text-orange-800">You already have a pending request. Wait for a reply or cancel it below.</p>}
          <button type="button" disabled={busy || !canSubmit} className={`${primary} w-full`} onClick={send}>{busy ? 'Saving…' : kind === 'merge' ? 'Request bill merge' : 'Request item assignment'}</button>
        </div>}
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        {Boolean(data?.requests.length) && <section className="mt-6 border-t border-stone-200 pt-4"><h3 className="text-sm font-semibold">Your requests</h3><div className="divide-y divide-stone-100">{data?.requests.map(request => <article key={request.id} className="py-3 text-sm"><p className="break-words font-medium">{request.from_name} → {request.to_name} · {request.kind === 'merge' ? 'Whole bill' : 'Assigned items'}</p><p className="mt-1 text-xs text-stone-500">{money(request.amount)} · {states[request.status]}</p>{request.status === 'pending' && !request.incoming && <button type="button" disabled={busy} className={`${button} mt-2`} onClick={() => decide(request, 'cancel')}>Cancel request</button>}{request.status === 'pending' && request.incoming && <p className="mt-1 text-xs text-stone-500">Close this panel to review and accept or decline the charges.</p>}</article>)}</div></section>}
        <p className="mt-4 text-xs leading-5 text-stone-500">Requests expire after 10 minutes. Paid bills, open payment checkouts, and food awaiting restaurant approval cannot be changed. Staff can help with discounts or an accepted merge.</p>
      </div>
    </div>}
  </section>;
}
