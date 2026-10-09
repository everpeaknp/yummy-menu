"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { MenuItem, QRTableContext } from "@/services/api";
import { addCartLine, CartLine, cartTotal, changeLineNotes, changeLineQuantity, shouldEndTableSession } from "@/lib/cart";

export interface QRSession {
  restaurantId: number;
  restaurantName: string;
  tableId: number;
  tableName: string;
  qrToken: string;
  startTime: number;
  orderedItems?: NonNullable<QRTableContext['ordered_items']>;
  activeOrderTotal?: number;
  activeOrderIds?: number[];
  accountLinked?: boolean;
}

interface CartContextType {
  cart: CartLine[];
  addToCart: (item: MenuItem, notes?: string, modifiers?: CartLine['modifiers']) => void;
  removeFromCart: (lineId: string) => void;
  updateQuantity: (lineId: string, delta: number) => void;
  updateNotes: (lineId: string, notes: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  session: QRSession | null;
  sessionWarning: string;
  refreshSession: () => Promise<void>;
  resetSession: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
function readSession(): QRSession | null {
  try {
    const raw = localStorage.getItem('yummy_qr_session');
    if (!raw) return null;
    const value = JSON.parse(raw);
    return value.qrToken && Number.isInteger(value.restaurantId) && Number.isInteger(value.tableId) ? value : null;
  } catch { return null; }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const routeRestaurantId = Number(pathname.match(/^\/(\d+)(?:\/|$)/)?.[1] || 0);
  const [drafts, setDrafts] = useState<CartLine[]>([]);
  const [session, setSession] = useState<QRSession | null>(null);
  const [sessionWarning, setSessionWarning] = useState('');
  const [restored, setRestored] = useState(false);
  const refreshing = useRef<Promise<void> | null>(null);
  const cart = drafts.filter(line => line.restaurantId === routeRestaurantId);
  const resetSession = useCallback(() => {
    localStorage.removeItem('yummy_qr_session');
    setSession(null);
    setSessionWarning('');
    window.dispatchEvent(new Event('yummy_qr_session_updated'));
  }, []);
  const refreshSession = useCallback(async () => {
    if (refreshing.current) return refreshing.current;
    const current = readSession();
    if (!current) return;
    refreshing.current = (async () => {
      try {
        const { getMyActiveTable, verifyQRToken } = await import('@/services/api');
        const context = current.accountLinked
          ? await getMyActiveTable(current.restaurantId)
          : await verifyQRToken(current.qrToken);
        if (!context || readSession()?.qrToken !== current.qrToken) return;
        const hadOrders = Boolean(current.activeOrderIds?.length || current.orderedItems?.length);
        if (hadOrders && !context.active_orders?.length && !context.ordered_items?.length) { resetSession(); return; }
        const updated: QRSession = {
          ...current, orderedItems: context.ordered_items || [],
          activeOrderIds: (context.active_orders || []).map(order => order.id),
          activeOrderTotal: (context.active_orders || []).reduce((sum, order) => sum + Number(order.grand_total ?? order.total ?? 0), 0),
        };
        localStorage.setItem('yummy_qr_session', JSON.stringify(updated));
        setSession(updated);
        setSessionWarning('');
      } catch (error) {
        if (readSession()?.qrToken !== current.qrToken) return;
        if (shouldEndTableSession(error)) resetSession();
        else setSessionWarning('Connection interrupted. Your table and draft are saved.');
      }
    })().finally(() => { refreshing.current = null; });
    return refreshing.current;
  }, [resetSession]);
  const resumeLinkedTable = useCallback(async () => {
    if (!routeRestaurantId) return;
    const { getMyActiveTable, getStoredCustomerToken } = await import('@/services/api');
    if (!getStoredCustomerToken()) return;
    try {
      const context = await getMyActiveTable(routeRestaurantId);
      const linkedSession: QRSession = {
        restaurantId: context.restaurant_id,
        restaurantName: context.restaurant_name,
        tableId: context.table_id,
        tableName: context.table_name,
        qrToken: context.token,
        startTime: Date.now(),
        orderedItems: context.ordered_items || [],
        activeOrderIds: (context.active_orders || []).map(order => order.id),
        activeOrderTotal: (context.active_orders || []).reduce(
          (sum, order) => sum + Number(order.grand_total ?? order.total ?? 0),
          0,
        ),
        accountLinked: true,
      };
      localStorage.setItem('yummy_qr_session', JSON.stringify(linkedSession));
      setSession(linkedSession);
      setSessionWarning('');
      window.dispatchEvent(new Event('yummy_qr_session_updated'));
    } catch (error: any) {
      if (error?.response?.status !== 401 && error?.response?.status !== 404) {
        setSessionWarning('We could not check your active table. Try again shortly.');
      }
    }
  }, [routeRestaurantId]);
  useEffect(() => {
    setSession(readSession());
    try {
      const stored = JSON.parse(localStorage.getItem('yummy_cart') || '[]');
      if (Array.isArray(stored)) setDrafts(stored.filter(line => typeof line.lineId === 'string' && Number.isInteger(line.restaurantId) && line.quantity > 0 && Number.isFinite(line.price)));
    } catch { /* An unreadable draft must not prevent opening the menu. */ }
    setRestored(true);
    void refreshSession();
    const sync = (event: Event) => {
      if (event instanceof StorageEvent && event.key !== 'yummy_qr_session') return;
      setSession(readSession());
      setSessionWarning('');
    };
    window.addEventListener('storage', sync);
    window.addEventListener('yummy_qr_session_updated', sync);
    const resume = () => { void resumeLinkedTable(); };
    window.addEventListener('yummy_customer_session_updated', resume);
    void resumeLinkedTable();
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('yummy_qr_session_updated', sync);
      window.removeEventListener('yummy_customer_session_updated', resume);
    };
  }, [refreshSession, resumeLinkedTable]);
  useEffect(() => { if (restored) localStorage.setItem('yummy_cart', JSON.stringify(drafts)); }, [drafts, restored]);
  const value: CartContextType = {
    cart,
    addToCart: (item, notes, modifiers) => setDrafts(previous => addCartLine(previous, item, notes, modifiers, routeRestaurantId)),
    removeFromCart: lineId => setDrafts(previous => previous.filter(line => line.lineId !== lineId)),
    updateQuantity: (lineId, delta) => setDrafts(previous => changeLineQuantity(previous, lineId, delta)),
    updateNotes: (lineId, notes) => setDrafts(previous => changeLineNotes(previous, lineId, notes)),
    clearCart: () => setDrafts(previous => previous.filter(line => line.restaurantId !== routeRestaurantId)),
    totalItems: cart.reduce((sum, line) => sum + line.quantity, 0), totalPrice: cartTotal(cart),
    session: routeRestaurantId && session?.restaurantId !== routeRestaurantId ? null : session,
    sessionWarning, refreshSession, resetSession,
  };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
