"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { MenuItem } from "@/services/api";

interface CartItem extends MenuItem {
  quantity: number;
  notes?: string;
  modifiers?: {
    modifier_id: number;
    modifier_name_snapshot: string;
    price_adjustment_snapshot: number;
  }[];
}

interface QRSession {
  restaurantId: number;
  restaurantName: string;
  tableId: number;
  tableName: string;
  qrToken: string;
  startTime: number;
  orderedItems?: {
    id: number;
    menu_item_id: number;
    name: string;
    quantity: number;
    status: string;
    unit_price?: number;
    line_total?: number;
    notes?: string;
    image?: string;
  }[];
  activeOrderTotal?: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: MenuItem, notes?: string, modifiers?: CartItem['modifiers']) => void;
  removeFromCart: (itemId: number) => void;
  updateQuantity: (itemId: number, delta: number) => void;
  updateNotes: (itemId: number, notes: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  session: QRSession | null;
  refreshSession: () => Promise<void>;
  resetSession: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [session, setSession] = useState<QRSession | null>(null);

  // Load session from localStorage on mount and stay in sync
  useEffect(() => {
    const syncSession = () => {
      const savedSession = localStorage.getItem("yummy_qr_session");
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        console.log("[CartContext] QR Session active:", parsed.tableName, "(Token:", parsed.qrToken, ")");
        setSession(parsed);
      } else {
        console.log("[CartContext] No QR Session found in localStorage.");
        setSession(null);
      }
    };

    syncSession();
    
    // Sync if localStorage changes in another tab
    window.addEventListener("storage", syncSession);
    // Sync if session is updated within same tab (custom event)
    window.addEventListener("yummy_qr_session_updated", syncSession as EventListener);
    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener("yummy_qr_session_updated", syncSession as EventListener);
    };
  }, []);

  const addToCart = (item: MenuItem, notes?: string, modifiers?: CartItem['modifiers']) => {
    setCart((prev) => {
      // Create a unique key for the item based on its ID, notes, and modifiers
      const modifierKey = (modifiers || []).map(m => m.modifier_id).sort().join(',');
      const itemKey = `${item.id}-${notes || ""}-${modifierKey}`;
      
      // We check if an item with the same ID AND same customization already exists
      // Wait, currently we don't store a separate 'cartItemId', we use the item's ID.
      // This is a problem if we want multiple customized versions of the same item.
      // I should change CartItem to have a unique 'id' separate from 'menuItemId'.
      
      const existingIndex = prev.findIndex((i) => {
        const iModKey = (i.modifiers || []).map(m => m.modifier_id).sort().join(',');
        return i.id === item.id && (i.notes || "") === (notes || "") && iModKey === modifierKey;
      });

      if (existingIndex > -1) {
        const newCart = [...prev];
        newCart[existingIndex].quantity += 1;
        return newCart;
      }
      return [...prev, { ...item, quantity: 1, notes, modifiers }];
    });
  };

  const removeFromCart = (itemId: number) => {
    setCart((prev) => prev.filter((i) => i.id !== itemId));
  };

  const updateQuantity = (itemId: number, delta: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
      ).filter(i => i.quantity > 0)
    );
  };

  const updateNotes = (itemId: number, notes: string) => {
    setCart((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, notes } : i))
    );
  };

  const clearCart = () => setCart([]);

  const resetSession = () => {
    localStorage.removeItem("yummy_qr_session");
    setSession(null);
    window.dispatchEvent(new Event("yummy_qr_session_updated"));
  };

  const refreshSession = async () => {
    if (!session?.qrToken) return;
    try {
      const { verifyQRToken } = await import("@/services/api");
      const context = await verifyQRToken(session.qrToken);
      if (context) {
        const hadActiveBefore =
          Number(session.activeOrderTotal ?? 0) > 0 ||
          (Array.isArray(session.orderedItems) && session.orderedItems.length > 0);
        const hasActiveNow = Array.isArray(context.active_orders) && context.active_orders.length > 0;
        const hasOrderedItemsNow = Array.isArray(context.ordered_items) && context.ordered_items.length > 0;

        // If this device had an active/ordered session before but server now reports none,
        // the table session has ended (order completed/table freed). Force re-scan.
        if (hadActiveBefore && !hasActiveNow && !hasOrderedItemsNow) {
          resetSession();
          return;
        }

        const totalFromActiveOrders = Array.isArray(context.active_orders)
          ? context.active_orders.reduce(
              (sum, order) => sum + Number(order.grand_total ?? order.total ?? 0),
              0
            )
          : 0;

        const totalFromOrderedItems = Array.isArray(context.ordered_items)
          ? context.ordered_items.reduce((sum, item: any) => {
              const itemLineTotal = Number(item.line_total ?? 0);
              if (itemLineTotal > 0) return sum + itemLineTotal;
              const itemUnitPrice = Number(item.unit_price ?? 0);
              return sum + (itemUnitPrice * Number(item.quantity ?? 0));
            }, 0)
          : 0;

        const updatedSession = {
          ...session,
          orderedItems: context.ordered_items,
          activeOrderTotal: totalFromActiveOrders || totalFromOrderedItems
        };
        localStorage.setItem("yummy_qr_session", JSON.stringify(updatedSession));
        setSession(updatedSession);
        window.dispatchEvent(new Event("yummy_qr_session_updated"));
      }
    } catch (err) {
      console.error("[CartContext] Refresh session failed (token likely invalid):", err);
      // If refresh fails, it means the token is likely regenerated/expired.
      // Clear session to prevent further ordering attempts.
      resetSession();
    }
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateNotes,
        clearCart,
        totalItems,
        totalPrice,
        session,
        refreshSession,
        resetSession,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
