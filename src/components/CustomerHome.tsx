"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Compass, ScanLine, UserRound } from 'lucide-react';
import { getAllRestaurants } from '@/services/api';
import useSWR from 'swr';
import CustomerGate from './CustomerGate';
import CustomerProfile from './CustomerProfile';
import RestaurantList from './RestaurantList';
import TableQrScanner from './TableQrScanner';
import ActiveTableReturn from './ActiveTableReturn';

export default function CustomerHome({ initialView = 'discover' }: { initialView?: 'discover' | 'profile' }) {
  const [view, setView] = useState(initialView);
  const [scan, setScan] = useState(false);
  const [profileRevision, setProfileRevision] = useState(0);
  useEffect(() => {
    const sync = () => { const next = new URLSearchParams(window.location.search).get('view'); setView(next === 'profile' || next === 'discover' ? next : initialView); };
    sync(); window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, [initialView]);
  const navigate = (next: 'discover' | 'profile') => {
    if (next === 'profile') setProfileRevision(current => current + 1);
    setView(next); const url = new URL(window.location.href); url.searchParams.set('view', next);
    url.searchParams.delete('section'); url.searchParams.delete('restaurant');
    window.history.pushState({}, '', url); window.scrollTo({ top: 0 });
  };
  return <main className="min-h-[100dvh] bg-stone-50 pb-[calc(5rem+env(safe-area-inset-bottom))] text-stone-950">
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white"><div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4 sm:px-6"><a href="/" className="flex items-center gap-2 font-display text-xl font-semibold"><Image src="/logos/yummy_logo.png" alt="" width={36} height={36} unoptimized />Yummy</a><button type="button" onClick={() => setScan(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-50 px-3 text-sm font-semibold text-orange-700"><ScanLine size={18} />Scan table</button></div></header>
    <CustomerGate><ActiveTableReturn />{view === 'profile' ? <CustomerProfile key={profileRevision} embedded /> : <Discovery />}</CustomerGate>
    <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)]"><div className="mx-auto flex h-16 max-w-md">{([{ id: 'discover', label: 'Discover', icon: Compass }, { id: 'profile', label: 'Profile', icon: UserRound }] as const).map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => navigate(id)} aria-current={view === id ? 'page' : undefined} className={`flex flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold ${view === id ? 'text-orange-600' : 'text-stone-500'}`}><Icon size={20} />{label}</button>)}</div></nav>
    <TableQrScanner open={scan} onClose={() => setScan(false)} />
  </main>;
}

function Discovery() {
  const { data, error, isLoading, mutate } = useSWR('customer-discovery', () => getAllRestaurants(true), { revalidateOnFocus: false, dedupingInterval: 60000 });
  return <section id="discover" className="mx-auto max-w-6xl px-4 py-6 sm:px-6"><h1 className="font-display text-2xl font-semibold">Find a restaurant</h1><p className="mt-2 text-sm text-stone-500">At a table? Scan its QR to connect your order.</p>{isLoading ? <p role="status" className="py-8 text-sm text-stone-500">Finding restaurants…</p> : error ? <div className="py-8"><p role="alert" className="text-sm text-stone-600">Could not load restaurants. Check your connection.</p><button type="button" onClick={() => void mutate()} className="mt-3 min-h-11 rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold">Try again</button></div> : <RestaurantList initialRestaurants={data || []} />}</section>;
}
