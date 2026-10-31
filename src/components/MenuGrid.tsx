"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { ArrowLeft, BellRing, BookOpen, ChevronRight, Home, Loader2, ReceiptText, ScanLine, Search, ShoppingBag, UserRound, Users, Utensils, X } from 'lucide-react';
import { getCustomerBills, getGroupedMenu, getImageUrl, getModifierGroups, MenuCategoryGroup, Restaurant } from '@/services/api';
import { useCart } from '@/context/CartContext';
import { cartUnitPrice } from '@/lib/cart';
import { money } from '@/lib/money';
import { useDialog } from '@/lib/useDialog';
import CategoryNav from './CategoryNav';
import CustomerGate from './CustomerGate';
import CustomerProfile from './CustomerProfile';
import FloatingCart from './FloatingCart';
import ExistingTableReturn from './ExistingTableReturn';
import MenuItemCard from './MenuItemCard';
import OrderedBillItems from './OrderedBillItems';
import PublicRestaurantOffers from './PublicRestaurantOffers';
import TableQrScanner from './TableQrScanner';
import TableServiceActions from './TableServiceActions';
import TableVisitAccess from './TableVisitAccess';

type View = 'menu' | 'order' | 'table' | 'profile' | 'cart';
const tabs = [
  { id: 'menu', label: 'Menu', icon: BookOpen },
  { id: 'order', label: 'Orders', icon: ReceiptText },
  { id: 'table', label: 'Table', icon: Users },
  { id: 'profile', label: 'You', icon: UserRound },
] as const;

export default function MenuGrid({ restaurantId, restaurant }: { initialCategories?: MenuCategoryGroup[]; restaurantId: string; restaurant?: Restaurant }) {
  const { session } = useCart();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const helpDialog = useDialog(helpOpen, () => setHelpOpen(false), 'help');
  return <main className="min-h-[100dvh] bg-stone-50 text-stone-950">
    <a href="#restaurant-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[150] focus:rounded-lg focus:bg-white focus:p-3">Skip to content</a>
    <header data-experience-header className="sticky top-0 z-40 border-b border-stone-200 bg-white">
      <div className="experience-width flex h-16 items-center gap-3">
        <Link href="/" aria-label="Find restaurants" className="customer-icon-button hidden sm:grid"><Home size={20} aria-hidden="true" /></Link>
        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-orange-50">{restaurant?.logo ? <Image src={getImageUrl(restaurant.logo)!} alt="" width={40} height={40} unoptimized className="h-full w-full object-cover" /> : <Utensils size={20} className="text-orange-600" aria-hidden="true" />}</div>
        <div className="min-w-0 flex-1"><h1 className="truncate font-display text-lg font-semibold">{restaurant?.name || 'Yummy'}</h1><p className="truncate text-xs text-stone-600">{session ? `Table ${session.tableName}` : 'Your next good meal'}<span className="hidden md:inline">{restaurant?.address ? ` · ${restaurant.address}` : ''}</span></p></div>
        <button type="button" onClick={() => setHelpOpen(true)} className="customer-nav-link px-3"><BellRing size={18} aria-hidden="true" /><span>Help</span></button>
        <button type="button" onClick={() => setScannerOpen(true)} aria-label="Scan a table QR" className="customer-icon-button"><ScanLine size={21} aria-hidden="true" /></button>
      </div>
    </header>
    <div id="restaurant-content" tabIndex={-1}>
      <CustomerGate><Workspace restaurantId={restaurantId} restaurant={restaurant} onScan={() => setScannerOpen(true)} /></CustomerGate>
    </div>
    <TableQrScanner open={scannerOpen} onClose={() => setScannerOpen(false)} />
    {helpOpen && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-stone-950/40 sm:items-center sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget) setHelpOpen(false); }}>
      <div ref={helpDialog} role="dialog" aria-modal="true" aria-labelledby="visit-help-title" className="max-h-[90dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl sm:p-7">
        <div className="mb-5 flex items-center justify-between"><h2 id="visit-help-title" className="customer-section-title">How can we help?</h2><button type="button" onClick={() => setHelpOpen(false)} aria-label="Close help" className="customer-icon-button"><X size={20} /></button></div>
        {session?.tableAccess?.access === 'approved' ? <TableServiceActions restaurantId={Number(restaurantId)} /> : <p className="text-sm leading-6 text-stone-600">Connect to your table to send service requests. The restaurant team can help you get connected.</p>}
        {restaurant?.phone && <a href={`tel:${restaurant.phone}`} className="customer-secondary-button mt-4 w-full">Call the restaurant</a>}
      </div>
    </div>}
  </main>;
}

function Workspace({ restaurantId, restaurant, onScan }: { restaurantId: string; restaurant?: Restaurant; onScan: () => void }) {
  const { totalItems, totalPrice, session, sessionWarning, refreshSession } = useCart();
  const [view, setView] = useState<View>('menu');
  const [profileSection, setProfileSection] = useState<'overview' | 'orders' | 'rewards'>('overview');
  const menuScroll = useRef(0);
  const viewRef = useRef<View>('menu');
  const tableAccess = session?.tableAccess;
  const { data: billActivity } = useSWR(tableAccess?.access === 'approved' && session?.qrToken ? ['bill-activity', session.qrToken] : null, () => getCustomerBills(session!.qrToken), { refreshInterval: 10000, refreshWhenHidden: false, shouldRetryOnError: false });
  const pendingBills = billActivity?.requests.filter(request => request.incoming && request.status === 'pending').length || 0;
  const pendingGuests = tableAccess?.is_host ? tableAccess.members.filter(member => member.status === 'pending').length : 0;
  const tableAccessLabel = tableAccess?.access === 'approved' ? 'Connected' : tableAccess?.access === 'pending' ? 'Awaiting approval' : tableAccess?.access === 'occupied' ? 'Ask host to invite you' : tableAccess?.access === 'removed' ? 'Access removed' : tableAccess?.access === 'expired' && tableAccess.visit_id ? 'Visit expired' : 'Tap to request';
  useEffect(() => {
    const restoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    const sync = () => {
      const value = new URLSearchParams(window.location.search).get('view');
      const next = value === 'orders' || value === 'rewards' ? 'profile' : ['order', 'profile', 'table', 'cart'].includes(value || '') ? value as View : 'menu';
      const viewChanged = viewRef.current !== next;
      if (value === 'orders' || value === 'rewards') setProfileSection(value);
      if (viewRef.current === 'menu' && next !== 'menu') menuScroll.current = window.scrollY;
      viewRef.current = next; setView(next);
      if (viewChanged) requestAnimationFrame(() => window.scrollTo({ top: next === 'menu' ? menuScroll.current : 0, behavior: 'instant' as ScrollBehavior }));
    };
    sync(); window.addEventListener('popstate', sync);
    return () => { window.removeEventListener('popstate', sync); window.history.scrollRestoration = restoration; };
  }, []);
  useEffect(() => {
    if (!session?.qrToken) return;
    void refreshSession();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refreshSession(); }, 5000);
    return () => window.clearInterval(timer);
  }, [session?.qrToken, refreshSession]);
  const goTo = useCallback((next: View) => {
    if (viewRef.current === 'menu') menuScroll.current = window.scrollY;
    viewRef.current = next; setView(next);
    const url = new URL(window.location.href);
    url.searchParams.set('view', next); url.searchParams.delete('checkout');
    if (next !== 'profile') url.searchParams.delete('section');
    if (next === 'cart') url.searchParams.delete('panel');
    window.history.pushState({}, '', url);
    requestAnimationFrame(() => window.scrollTo({ top: next === 'menu' ? menuScroll.current : 0, behavior: 'instant' as ScrollBehavior }));
  }, []);
  const navigation = (mobile = false) => <nav aria-label="Customer navigation" className={mobile ? 'fixed inset-x-0 bottom-0 z-50 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] xl:hidden' : 'sticky top-16 z-30 hidden border-b border-stone-200 bg-white xl:block'}>
    <div className={mobile ? 'mx-auto grid h-16 max-w-xl grid-cols-4 px-2' : 'experience-width flex h-16 items-center gap-2'}>
      {tabs.map(({ id, label, icon: Icon }) => <a key={id} href={`?view=${id}`} aria-current={view === id ? 'page' : undefined} onClick={event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); goTo(id); }} className={mobile ? `flex flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold ${view === id ? 'text-orange-700' : 'text-stone-600'}` : 'customer-nav-link'}>
        <span className={`relative grid h-7 w-12 place-items-center rounded-full ${mobile && view === id ? 'bg-orange-50' : ''}`}><Icon size={20} aria-hidden="true" />{((id === 'table' && pendingGuests > 0) || (id === 'order' && pendingBills > 0)) && <span className="absolute -right-1 -top-1 rounded-full bg-orange-600 px-1.5 text-[10px] text-white" aria-label={id === 'table' ? `${pendingGuests} guests waiting` : `${pendingBills} bill requests waiting`}>{id === 'table' ? pendingGuests : pendingBills}</span>}</span>{label}
      </a>)}
      {!mobile && <Link href="/" className="ml-auto text-sm font-medium text-stone-600 hover:text-orange-700">All restaurants</Link>}
    </div>
  </nav>;
  return <div className={view === 'cart' ? '' : 'pb-[calc(5rem+env(safe-area-inset-bottom))] xl:pb-10'}>
    {view !== 'cart' && navigation()}
    {sessionWarning && <p role="status" className="experience-width bg-amber-50 py-3 text-sm text-amber-900">{sessionWarning}</p>}
    <div hidden={view !== 'menu'}><MenuView restaurantId={restaurantId} onCart={() => goTo('cart')} onTable={() => goTo('table')} tableLabel={session ? `Table ${session.tableName} · ${tableAccessLabel}` : 'Connect to a table to order'} /></div>
    {(view === 'order' || view === 'cart') && <FloatingCart mode={view === 'cart' ? 'cart' : 'orders'} onBrowse={() => goTo('menu')} onScan={onScan} onCart={() => goTo('cart')} onTable={() => goTo('table')} onSubmitted={() => goTo('order')} pendingBills={pendingBills} />}
    {view === 'table' && <div className="experience-width py-6 sm:py-8"><div className="mb-6"><h2 className="customer-page-title">Your table</h2><p className="mt-2 text-sm text-stone-600">Your people, your visit. Everyone keeps their own cart and bill.</p></div>
      {session?.tableAccess?.access !== 'approved' && session?.tableId != null && <ExistingTableReturn restaurantId={Number(restaurantId)} currentTableId={session.tableId} />}
      {session ? <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"><div><TableVisitAccess /><Link href="/" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-stone-600"><ArrowLeft size={16} />Find restaurants</Link></div><div><TableServiceActions restaurantId={Number(restaurantId)} />{Boolean(session.orderedItems?.length) && <section className="customer-card p-5"><h3 className="customer-section-title">Table order</h3><p className="mb-4 mt-2 text-sm leading-6 text-stone-600">Submitted items for everyone. Each person&apos;s bill stays separate unless they agree to combine it.</p><OrderedBillItems items={session.orderedItems || []} /></section>}</div></div> : <section className="customer-card max-w-xl p-6 sm:p-8"><ScanLine size={28} className="text-orange-600" aria-hidden="true" /><h3 className="mt-5 text-xl font-semibold">Take a seat. Scan your table.</h3><p className="mt-3 text-sm leading-6 text-stone-600">Scan the restaurant&apos;s table QR, or open an invitation from your host. You can keep choosing food while you get connected.</p><button type="button" onClick={onScan} className="customer-primary-button mt-6"><ScanLine size={18} />Scan table QR</button></section>}
    </div>}
    {view === 'profile' && <CustomerProfile embedded restaurantId={restaurantId} restaurantName={restaurant?.name} initialSection={profileSection} />}
    {view === 'menu' && totalItems > 0 && <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t border-stone-200 bg-white p-3 xl:hidden"><button type="button" onClick={() => goTo('cart')} className="customer-primary-button mx-auto flex w-full max-w-xl justify-between"><span className="rounded-lg bg-white/15 px-2 py-1">{totalItems}</span><span>Review cart</span><span>{money(totalPrice)}</span><ChevronRight size={18} aria-hidden="true" /></button></div>}
    {view !== 'cart' && navigation(true)}
  </div>;
}

function MenuView({ restaurantId, onCart, onTable, tableLabel }: { restaurantId: string; onCart: () => void; onTable: () => void; tableLabel: string }) {
  const { cart, totalItems, totalPrice } = useCart();
  const [search, setSearch] = useState('');
  useEffect(() => {
    const restore = () => setSearch(new URLSearchParams(window.location.search).get('q') || '');
    restore(); window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  const changeSearch = (value: string) => {
    setSearch(value); const url = new URL(window.location.href);
    if (value) url.searchParams.set('q', value); else url.searchParams.delete('q');
    window.history.replaceState(window.history.state, '', url);
  };
  const { data, error, isLoading, mutate } = useSWR(`customer-menu-${restaurantId}`, async () => {
    const [categories, modifierGroups] = await Promise.all([getGroupedMenu(restaurantId), getModifierGroups(restaurantId)]);
    return { categories, modifierGroups };
  }, { revalidateOnFocus: true, dedupingInterval: 30000, errorRetryCount: 2 });
  const categories = useMemo(() => (data?.categories || []).map(category => ({ ...category, items: category.items.filter(item => `${item.name} ${item.description || ''}`.toLowerCase().includes(search.trim().toLowerCase())) })).filter(category => category.items.length), [data, search]);
  const searchField = <div className="relative"><Search size={18} aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" /><input type="search" name="menu-search" autoComplete="off" value={search} onChange={event => changeSearch(event.target.value)} aria-label="Search menu" placeholder="Search dishes…" className="profile-input pl-10 pr-11" />{search && <button type="button" onClick={() => changeSearch('')} aria-label="Clear search" className="absolute right-0 top-0 grid h-12 w-11 place-items-center text-stone-600"><X size={18} /></button>}</div>;
  if (isLoading) return <div role="status" className="experience-width py-8"><div className="flex items-center gap-2 text-sm text-stone-600"><Loader2 size={18} className="animate-spin motion-reduce:animate-none" />Loading the menu…</div><div className="mt-6 grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map(item => <div key={item} className="h-32 animate-pulse rounded-2xl bg-stone-200/60 motion-reduce:animate-none" />)}</div></div>;
  if (error) return <div className="mx-auto max-w-sm px-5 py-14 text-center"><h2 className="customer-section-title">Could not load the menu</h2><p role="alert" className="mt-3 text-sm leading-6 text-stone-600">Check your connection and try again. Your saved draft is kept on this device.</p><button type="button" onClick={() => void mutate()} className="customer-primary-button mt-5">Retry</button></div>;
  return <>
    <div data-menu-controls className="sticky top-16 z-30 border-b border-stone-200 bg-white xl:hidden"><div className="px-4 pt-3">{searchField}</div><CategoryNav categories={categories} /></div>
    <div className="experience-width py-5 xl:grid xl:grid-cols-[11rem_minmax(0,1fr)_18rem] xl:gap-7 xl:py-8">
      <aside className="hidden xl:block"><div className="sticky top-36"><p className="mb-4 text-sm font-semibold">Explore the menu</p><CategoryNav categories={categories} layout="vertical" /></div></aside>
      <div className="min-w-0 pb-24 xl:pb-0"><div className="mb-6 flex flex-wrap items-center justify-between gap-2"><h2 className="customer-page-title">On the menu</h2><button type="button" onClick={onTable} className="flex min-h-11 items-center gap-2 text-sm font-medium text-stone-600 hover:text-orange-700"><Users size={16} aria-hidden="true" />{tableLabel}<ChevronRight size={16} /></button></div><div className="mb-6 hidden xl:block">{searchField}</div>
        <PublicRestaurantOffers restaurantId={Number(restaurantId)} />
        {categories.length ? <div className="space-y-8">{categories.map(category => <section key={category.id} id={`category-${category.id}`} className="scroll-mt-48 xl:scroll-mt-36"><div className="mb-3 flex items-baseline gap-2"><h3 className="customer-section-title">{category.name}</h3><span className="text-xs text-stone-600">{category.items.length}</span></div>{category.description && <p className="mb-4 text-sm leading-6 text-stone-600">{category.description}</p>}<div className="customer-card divide-y divide-stone-200">{category.items.map(item => <MenuItemCard key={item.id} item={item} modifierGroups={data?.modifierGroups || []} restaurantId={restaurantId} />)}</div></section>)}</div> : <div className="customer-card px-5 py-14 text-center"><Search size={28} className="mx-auto text-stone-400" aria-hidden="true" /><h3 className="mt-4 font-semibold">{search ? 'No matching dishes' : 'The menu is being prepared'}</h3><p className="mt-2 text-sm text-stone-600">{search ? 'Try another name or clear your search.' : 'Please ask the restaurant team for help.'}</p>{search && <button type="button" onClick={() => changeSearch('')} className="customer-secondary-button mt-5">Clear search</button>}</div>}
      </div>
      <aside className="hidden xl:block"><div className="customer-card sticky top-36 p-5"><div className="flex items-center gap-2"><ShoppingBag size={19} className="text-orange-600" aria-hidden="true" /><h3 className="font-semibold">Your cart</h3>{totalItems > 0 && <span className="ml-auto text-sm text-stone-600">{totalItems} items</span>}</div>{cart.length ? <><ul className="my-5 divide-y divide-stone-100">{cart.map(line => <li key={line.lineId} className="flex gap-3 py-3 text-sm"><span className="text-stone-600">{line.quantity}×</span><div className="min-w-0 flex-1"><p className="break-words font-medium">{line.name}</p>{Boolean(line.modifiers?.length) && <p className="mt-1 text-xs leading-5 text-stone-600">{line.modifiers?.map(modifier => modifier.modifier_name_snapshot).join(', ')}</p>}</div><span className="shrink-0 tabular-nums">{money(cartUnitPrice(line) * line.quantity)}</span></li>)}</ul><div className="mb-4 flex justify-between border-t border-stone-200 pt-4 text-sm font-semibold"><span>Cart estimate</span><span>{money(totalPrice)}</span></div><button type="button" onClick={onCart} className="customer-primary-button w-full">Review cart<ChevronRight size={17} /></button><p className="mt-3 text-xs leading-5 text-stone-600">Nothing is sent until you confirm.</p></> : <div className="py-10 text-center"><Utensils size={28} className="mx-auto text-stone-300" aria-hidden="true" /><p className="mt-4 text-sm font-medium">Something good starts here</p><p className="mt-2 text-sm leading-6 text-stone-600">Add dishes from the menu, then review your order.</p></div>}</div></aside>
    </div>
  </>;
}
