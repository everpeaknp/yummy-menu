"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { BookOpen, ChevronRight, Home, Loader2, ScanLine, Search, ShoppingBag, UserRound, Utensils, X } from 'lucide-react';
import { getGroupedMenu, getImageUrl, getModifierGroups, MenuCategoryGroup, Restaurant } from '@/services/api';
import { useCart } from '@/context/CartContext';
import CategoryNav from './CategoryNav';
import CustomerGate from './CustomerGate';
import CustomerProfile from './CustomerProfile';
import FloatingCart from './FloatingCart';
import MenuItemCard from './MenuItemCard';
import TableQrScanner from './TableQrScanner';
import TableServiceActions from './TableServiceActions';

type View = 'menu' | 'order' | 'profile';
const tabs = [{ id: 'menu', label: 'Menu', icon: BookOpen }, { id: 'order', label: 'Order', icon: ShoppingBag }, { id: 'profile', label: 'Profile', icon: UserRound }] as const;
const money = (amount: number) => new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 2 }).format(amount);

export default function MenuGrid({ restaurantId, restaurant }: { initialCategories?: MenuCategoryGroup[]; restaurantId: string; restaurant?: Restaurant }) {
  const { session } = useCart();
  const [scannerOpen, setScannerOpen] = useState(false);
  return <main className="min-h-[100dvh] bg-stone-50 text-stone-950">
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" aria-label="Yummy homepage" title="Yummy homepage" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-stone-600 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><Home size={21} aria-hidden="true" /></Link>
        <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-orange-50">{restaurant?.logo ? <Image src={getImageUrl(restaurant.logo)!} alt="" width={44} height={44} unoptimized className="h-full w-full object-cover" /> : <Utensils size={22} className="text-orange-600" />}</div>
        <div className="min-w-0 flex-1"><h1 className="truncate text-base font-bold sm:text-lg">{restaurant?.name || 'Yummy'}</h1><p className="mt-0.5 truncate text-xs text-stone-500">{session ? `Table ${session.tableName}` : 'Sign in, browse and order'}<span className="hidden md:inline">{restaurant?.address ? ` · ${restaurant.address}` : ''}</span></p></div>
        <button type="button" onClick={() => setScannerOpen(true)} aria-label="Scan a table QR" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-orange-500"><ScanLine size={21} /></button>
      </div>
    </header>
    <CustomerGate><Workspace restaurantId={restaurantId} restaurant={restaurant} onScan={() => setScannerOpen(true)} /></CustomerGate>
    <TableQrScanner open={scannerOpen} onClose={() => setScannerOpen(false)} />
  </main>;
}

function Workspace({ restaurantId, restaurant, onScan }: { restaurantId: string; restaurant?: Restaurant; onScan: () => void }) {
  const { totalItems, totalPrice, session, sessionWarning } = useCart();
  const [view, setView] = useState<View>('menu');
  const [profileSection, setProfileSection] = useState<'overview' | 'orders' | 'rewards'>('overview');
  useEffect(() => {
    const sync = () => {
      const value = new URLSearchParams(window.location.search).get('view');
      if (value === 'orders' || value === 'rewards') { setProfileSection(value); setView('profile'); }
      else setView(value === 'profile' || value === 'order' ? value : 'menu');
    };
    sync(); window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  const goTo = (next: View) => {
    setView(next);
    const url = new URL(window.location.href); url.searchParams.set('view', next);
    window.history.pushState({}, '', url);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };
  const navigation = (mobile = false) => <nav aria-label="Customer navigation" className={mobile ? 'fixed inset-x-0 bottom-0 z-50 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden' : 'mx-auto hidden max-w-7xl justify-center gap-2 border-b border-stone-200 px-6 py-3 lg:flex'}><div className={mobile ? 'mx-auto grid h-16 max-w-lg grid-cols-3' : 'flex gap-2'}>{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={view === id ? 'page' : undefined} onClick={() => goTo(id)} className={`${mobile ? 'flex flex-col items-center justify-center gap-1 text-[11px]' : 'flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm'} font-semibold focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500 ${view === id ? 'text-orange-600 lg:bg-orange-50' : 'text-stone-500 hover:bg-stone-50'}`}><span className="relative"><Icon size={20} />{id === 'order' && totalItems > 0 && <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-orange-600 px-1 text-[9px] text-white">{totalItems}</span>}</span>{label}</button>)}</div></nav>;
  return <div className="pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8">
    {navigation()}
    {sessionWarning && <p role="status" className="mx-auto max-w-7xl bg-amber-50 px-4 py-3 text-xs text-amber-800 sm:px-6">{sessionWarning}</p>}
    {view === 'menu' && <MenuView restaurantId={restaurantId} />}
    {view === 'order' && <FloatingCart onBrowse={() => goTo('menu')} onScan={onScan} />}
    {view === 'profile' && <CustomerProfile embedded restaurantId={restaurantId} restaurantName={restaurant?.name} initialSection={profileSection} />}
    {view === 'menu' && totalItems > 0 && <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t border-stone-200 bg-white p-3 lg:bottom-5 lg:left-auto lg:right-6 lg:rounded-2xl lg:border lg:shadow-lg"><button type="button" onClick={() => goTo('order')} className="mx-auto flex min-h-12 w-full max-w-lg items-center gap-3 rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700 lg:min-w-72"><span className="grid h-7 min-w-7 place-items-center rounded-lg bg-white/20">{totalItems}</span><span className="flex-1 text-left">View order</span><span>{money(totalPrice)}</span><ChevronRight size={18} /></button></div>}
    {navigation(true)}
  </div>;
}

function MenuView({ restaurantId }: { restaurantId: string }) {
  const [search, setSearch] = useState('');
  const { data, error, isLoading, mutate } = useSWR(`customer-menu-${restaurantId}`, async () => {
    const [categories, modifierGroups] = await Promise.all([getGroupedMenu(restaurantId), getModifierGroups(restaurantId)]);
    return { categories, modifierGroups };
  }, { revalidateOnFocus: true, dedupingInterval: 30000, errorRetryCount: 2 });
  const categories = useMemo(() => (data?.categories || []).map(category => ({ ...category, items: category.items.filter(item => `${item.name} ${item.description || ''}`.toLowerCase().includes(search.trim().toLowerCase())) })).filter(category => category.items.length), [data, search]);
  const searchField = <div className="relative"><Search size={18} aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} aria-label="Search menu" placeholder="Search dishes…" className="min-h-11 w-full rounded-xl border border-stone-200 bg-stone-50 pl-10 pr-11 text-base sm:text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />{search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-0 top-0 grid h-11 w-11 place-items-center text-stone-500"><X size={18} /></button>}</div>;
  if (isLoading) return <div role="status" className="mx-auto max-w-7xl p-5"><div className="flex items-center gap-2 py-4 text-sm text-stone-500"><Loader2 size={18} className="animate-spin" />Loading the menu…</div><div className="grid gap-3 md:grid-cols-2">{[1, 2, 3, 4].map(item => <div key={item} className="h-32 animate-pulse rounded-2xl bg-stone-200/60" />)}</div></div>;
  if (error) return <div className="mx-auto max-w-sm px-5 py-14 text-center"><h2 className="font-semibold">Could not load the menu</h2><p role="alert" className="mt-2 text-sm text-stone-500">Your table and draft are saved. Check your connection and try again.</p><button type="button" onClick={() => void mutate()} className="mt-5 min-h-11 rounded-xl bg-orange-600 px-5 text-sm font-semibold text-white">Retry</button></div>;
  return <>
    <div data-menu-controls className="sticky top-[72px] z-30 border-b border-stone-200 bg-white lg:hidden"><div className="px-4 pt-3">{searchField}</div><CategoryNav categories={categories} /></div>
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-8 lg:py-6">
      <aside className="hidden lg:block"><div className="sticky top-[88px] space-y-4">{searchField}<CategoryNav categories={categories} layout="vertical" /></div></aside>
      <div className="min-w-0 pb-20 lg:pb-0"><TableServiceActions restaurantId={Number(restaurantId)} />{categories.length ? <div className="space-y-7">{categories.map(category => <section key={category.id} id={`category-${category.id}`} className="scroll-mt-48 lg:scroll-mt-24"><div className="mb-3 flex items-center gap-2"><h2 className="text-lg font-bold">{category.name}</h2><span className="text-xs text-stone-400">{category.items.length}</span></div>{category.description && <p className="mb-3 text-sm text-stone-500">{category.description}</p>}<div className="grid gap-3 md:grid-cols-2">{category.items.map(item => <MenuItemCard key={item.id} item={item} modifierGroups={data?.modifierGroups || []} restaurantId={restaurantId} />)}</div></section>)}</div> : <div className="py-14 text-center"><h2 className="font-semibold">{search ? 'No matching dishes' : 'The menu is being prepared'}</h2><p className="mt-2 text-sm text-stone-500">{search ? 'Try another name or clear your search.' : 'Please ask the restaurant team for help.'}</p>{search && <button onClick={() => setSearch('')} className="mt-4 min-h-11 rounded-xl border border-stone-200 px-5 text-sm font-semibold">Clear search</button>}</div>}</div>
    </div>
  </>;
}
