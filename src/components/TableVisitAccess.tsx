"use client";

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Crown, QrCode, Settings2, ShieldCheck, Users, X } from 'lucide-react';
import QRCode from 'qrcode';
import { useCart } from '@/context/CartContext';
import { useDialog } from '@/lib/useDialog';
import { createTableInvite, manageTableGuest, requestTableAccess, revokeTableInvite } from '@/services/api';

const control = 'inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:opacity-50';
const button = `${control} border-stone-200 hover:bg-stone-50`;
const primary = `${control} border-orange-600 bg-orange-600 text-white hover:bg-orange-700`;
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase() || '?';

export default function TableVisitAccess() {
  const { session, refreshSession } = useCart();
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const contextVersion = useRef(0);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [modal, setModal] = useState<'invite' | 'members' | null>(null);
  const [invite, setInvite] = useState<{ image: string; url: string; expires: string } | null>(null);
  const [now, setNow] = useState(Date.now());
  const access = session?.tableAccess;
  const dialog = useDialog(modal !== null, () => setModal(null));
  useEffect(() => {
    if (!session?.qrToken) return;
    void refreshSession();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refreshSession(); }, 5000);
    return () => clearInterval(timer);
  }, [session?.qrToken, refreshSession]);
  useEffect(() => { contextVersion.current++; setInvite(null); setModal(null); setCopied(false); setError(''); }, [session?.qrToken, access?.is_host]);
  useEffect(() => {
    if (modal !== 'invite') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [modal]);
  if (!session) return null;

  const run = async (task: () => Promise<unknown>) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try { await task(); await refreshSession(); }
    catch (e: any) { setError(typeof e.response?.data?.detail === 'string' ? e.response.data.detail : 'Could not update table access. Try again; your cart is saved.'); }
    finally { inFlight.current = false; setBusy(false); }
  };
  const generate = async () => {
    const version = contextVersion.current;
    const result = await createTableInvite(access!.visit_id!);
    const menuBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://menu.yummyever.com').replace(/\/+$/, '');
    const url = `${menuBaseUrl}/join-table#${encodeURIComponent(result.token)}`;
    const image = await QRCode.toDataURL(url, { width: 280, margin: 3 });
    if (version !== contextVersion.current) return;
    setInvite({ image, url, expires: result.expires_at });
    setNow(Date.now()); setCopied(false);
  };
  const joined = (access?.members || []).filter(m => m.status === 'approved').sort((a, b) => Number(b.is_host) - Number(a.is_host));
  const pending = access?.is_host ? access.members.filter(m => m.status === 'pending') : [];
  const approved = access?.access === 'approved';
  const seconds = invite ? Math.max(0, Math.ceil((new Date(invite.expires).getTime() - now) / 1000)) : 0;
  const messages: Record<string, string> = {
    unverified: 'Ask the restaurant to confirm your table. You can browse and build your cart while you wait.',
    pending: access?.visit_id ? 'Your host will approve your request. You can keep browsing while you wait.' : 'The restaurant is confirming your table. You can keep browsing while you wait.',
    occupied: 'This table already has a host. Ask them for an invite QR, or ask restaurant staff for help.',
    rejected: 'Your request was not approved. Check with the restaurant or request again.',
    removed: 'Your access was removed. Ask your host or the restaurant for help.',
    expired: 'Your request or visit expired. Ask the restaurant for help.',
  };
  const errorMessage = error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>;

  return <>
    <section className="mx-auto my-5 max-w-7xl overflow-hidden rounded-2xl border border-stone-200 bg-white" aria-labelledby="table-access-heading">
      <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center sm:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 id="table-access-heading" className="break-words text-lg font-semibold tracking-tight text-stone-900">Table {session.tableName}</h2>
            {approved && <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">{access?.is_host ? <Crown size={13} aria-hidden="true" /> : <Check size={13} aria-hidden="true" />}{access?.is_host ? 'You are the host' : 'You’re at this table'}</span>}
          </div>
          <p role="status" className="mt-1.5 max-w-xl text-sm leading-6 text-stone-500">{approved ? 'Good food, shared company. Everyone keeps their own cart.' : messages[access?.access || 'unverified']}</p>
        </div>
        {access?.is_host ? <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" onClick={() => setModal('members')} className={button}><Settings2 size={16} aria-hidden="true" />Manage guests</button>
          <button type="button" disabled={busy} onClick={() => { setNow(Date.now()); setModal('invite'); if (!invite || new Date(invite.expires).getTime() <= Date.now()) void run(generate); }} className={primary}><QrCode size={17} aria-hidden="true" />Invite friends</button>
        </div> : (['unverified', 'rejected'].includes(access?.access || 'unverified') || (access?.access === 'expired' && !access.visit_id)) && <button type="button" disabled={busy} onClick={() => run(() => requestTableAccess(session.qrToken))} className={`${primary} shrink-0`}>{busy ? 'Sending…' : 'Request table access'}</button>}
      </div>
      {approved && <div className="border-t border-stone-100 px-5 py-4 sm:px-6">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-stone-600"><Users size={16} aria-hidden="true" /><h3>At your table</h3><span className="text-stone-500">({joined.length})</span></div>
        <ul className="flex flex-wrap gap-x-7 gap-y-4">{joined.map(member => <li key={member.account_id} className="flex min-w-0 max-w-full items-center gap-2.5">
          <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${member.is_host ? 'bg-orange-100 text-orange-800' : 'bg-stone-100 text-stone-600'}`}>{initials(member.name)}</span>
          <div className="min-w-0"><p className="break-words text-sm font-semibold text-stone-800">{member.name}{(member.is_you || (member.is_host && access?.is_host)) && <span className="font-normal text-stone-500"> (you)</span>}</p><p className="text-xs text-stone-500">{member.is_host ? 'Table host' : 'Joined'}</p></div>
        </li>)}</ul>
        {joined.length === 0 && <p className="text-sm text-stone-500">Your table’s guest list is not available yet. It will refresh automatically.</p>}
        {joined.length === 1 && <p className="mt-3 text-sm text-stone-500">{access?.is_host ? 'Your friends will appear here after you approve them.' : 'Your table companions will appear here.'}</p>}
        {pending.length > 0 && <div className="mt-4 border-t border-stone-100 pt-4">
          <h3 className="text-sm font-semibold text-stone-900">Waiting to join <span className="ml-1 rounded-full bg-orange-50 px-2 py-0.5 text-orange-700">{pending.length}</span></h3>
          <ul className="mt-2 divide-y divide-stone-100">{pending.map(member => <li key={member.account_id} className="flex flex-wrap items-center justify-between gap-3 py-2"><p className="min-w-0 break-words text-sm text-stone-700">{member.name}</p><div className="flex gap-2">
            <button type="button" disabled={busy} className={button} aria-label={`Decline ${member.name}`} onClick={() => { if (window.confirm(`Decline ${member.name}’s request to join?`)) void run(() => manageTableGuest(access!.visit_id!, member.account_id, 'remove')); }}>Decline</button>
            <button type="button" disabled={busy} className={primary} aria-label={`Approve guest ${member.name}`} onClick={() => run(() => manageTableGuest(access!.visit_id!, member.account_id, 'approve'))}><Check size={15} aria-hidden="true" />Approve</button>
          </div></li>)}</ul>
        </div>}
      </div>}
      <div className="px-5 pb-1 sm:px-6">{!modal && errorMessage}</div>
    </section>
    {modal && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm" onClick={event => { if (event.target === event.currentTarget) setModal(null); }}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="table-dialog-title" className="max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl bg-white p-5 shadow-xl sm:p-7">
        <div className="flex items-start justify-between gap-3"><div><h2 id="table-dialog-title" className="text-xl font-semibold tracking-tight text-stone-900">{modal === 'invite' ? 'Bring friends to the table' : 'Your table, your people'}</h2><p className="mt-1 text-sm text-stone-500">Table {session.tableName}</p></div><button type="button" className={`${button} shrink-0 px-3`} onClick={() => setModal(null)} aria-label="Close"><X size={18} aria-hidden="true" /></button></div>
        {modal === 'invite' ? <>
          <p className="mt-4 text-sm leading-6 text-stone-600">Let friends scan this code or share the link. You’ll approve each person before they can order.</p>
          {busy && !invite ? <p role="status" className="py-16 text-center text-sm text-stone-500">Creating your invite…</p> : invite && seconds > 0 ? <>
            <div className="mx-auto my-5 w-fit rounded-2xl border border-stone-200 p-2">
              {/* Generated invitation QR, not a remote image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={invite.image} width={280} height={280} alt="Scan to request to join this table" className="h-auto max-w-full" />
            </div>
            <p className="text-center text-sm text-stone-500">Link expires in <span className="font-semibold tabular-nums text-stone-800">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span></p>
            <button type="button" disabled={busy} className={`${primary} mt-5 w-full`} onClick={() => run(async () => { await navigator.clipboard.writeText(invite.url); setCopied(true); })}>{copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}{copied ? 'Invite link copied' : 'Copy invite link'}</button>
            <button type="button" disabled={busy} className={`${button} mt-2 w-full`} onClick={() => run(async () => { await revokeTableInvite(access!.visit_id!); setInvite(null); })}>Revoke invite link</button>
          </> : <div className="py-7 text-center"><p className="mb-4 text-sm text-stone-500">{invite ? 'This invite has expired.' : 'Create a fresh invite for your friends.'}</p><button type="button" disabled={busy} className={primary} onClick={() => run(generate)}>{busy ? 'Creating…' : 'Create invite QR'}</button></div>}
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-stone-500"><ShieldCheck size={15} className="mt-0.5 shrink-0" aria-hidden="true" />Only approved friends can access this table. The restaurant still reviews food requests.</p>
          <span role="status" className="sr-only">{copied ? 'Invite link copied' : ''}</span>
        </> : <>
          <p className="mt-4 text-sm leading-6 text-stone-500">Manage joined friends here. Making someone host transfers your invite and approval controls.</p>
          <ul className="mt-3 divide-y divide-stone-100">{joined.map(member => <li key={member.account_id} className="py-4"><div className="flex items-center gap-2"><span className="break-words text-sm font-semibold text-stone-800">{member.name}</span>{member.is_host && <span className="shrink-0 text-xs text-orange-700">Host (you)</span>}</div>{!member.is_host && <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" disabled={busy} className={button} onClick={() => { if (window.confirm(`Make ${member.name} the host? You will lose host controls.`)) void run(() => manageTableGuest(access!.visit_id!, member.account_id, 'transfer')); }}>Make host</button>
            <button type="button" disabled={busy} className={`${button} text-red-700`} onClick={() => { if (window.confirm(`Remove ${member.name} from this visit?`)) void run(() => manageTableGuest(access!.visit_id!, member.account_id, 'remove')); }}>Remove</button>
          </div>}</li>)}</ul>
        </>}
        {errorMessage}
      </div>
    </div>}
  </>;
}
