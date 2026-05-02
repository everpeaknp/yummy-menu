"use client";

import { useCart } from "@/context/CartContext";
import { ShoppingBag, X, Minus, Plus, Utensils, Send, Loader2, ShoppingCart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { requestOrder, getImageUrl, getGroupedMenu } from "@/services/api";
import Image from "next/image";

export default function FloatingCart() {
  const { cart, totalItems, totalPrice, updateQuantity, updateNotes, session, clearCart, refreshSession, resetSession } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderedTotalFromMenuFallback, setOrderedTotalFromMenuFallback] = useState(0);
  const [orderedMenuPriceMap, setOrderedMenuPriceMap] = useState<Record<number, number>>({});

  const orderedTotalFromItems = useMemo(() => (session?.orderedItems || []).reduce((sum, item) => {
    const lineTotal = Number((item as any).line_total ?? 0);
    if (lineTotal > 0) return sum + lineTotal;
    const unitPrice = Number((item as any).unit_price ?? 0);
    return sum + (unitPrice * Number(item.quantity ?? 0));
  }, 0), [session?.orderedItems]);

  useEffect(() => {
    let cancelled = false;

    const computeFallbackOrderedTotal = async () => {
      if (!session?.restaurantId || !session?.orderedItems?.length) {
        setOrderedTotalFromMenuFallback(0);
        setOrderedMenuPriceMap({});
        return;
      }

      const hasServerOrderedTotal = Number(session?.activeOrderTotal ?? 0) > 0 || orderedTotalFromItems > 0;
      if (hasServerOrderedTotal) {
        setOrderedTotalFromMenuFallback(0);
        return;
      }

      try {
        const grouped = await getGroupedMenu(String(session.restaurantId));
        const priceMap: Record<number, number> = {};
        grouped.forEach((group) => {
          group.items.forEach((item) => {
            priceMap[Number(item.id)] = Number(item.price ?? 0);
          });
        });

        const fallbackTotal = (session.orderedItems || []).reduce((sum, item) => {
          const menuPrice = Number(priceMap[Number(item.menu_item_id)] ?? 0);
          return sum + (menuPrice * Number(item.quantity ?? 0));
        }, 0);

        if (!cancelled) {
          setOrderedMenuPriceMap(priceMap);
          setOrderedTotalFromMenuFallback(fallbackTotal);
        }
      } catch (err) {
        if (!cancelled) {
          setOrderedTotalFromMenuFallback(0);
          setOrderedMenuPriceMap({});
        }
      }
    };

    computeFallbackOrderedTotal();

    return () => {
      cancelled = true;
    };
  }, [session?.restaurantId, session?.orderedItems, session?.activeOrderTotal, orderedTotalFromItems]);

  const orderedTotal = Number(session?.activeOrderTotal ?? 0) || orderedTotalFromItems || orderedTotalFromMenuFallback;
  const draftTotal = totalPrice;
  const grandTotal = orderedTotal + draftTotal;

  useEffect(() => {
    if (!isOpen || !session) return;
    refreshSession();
    const timer = setInterval(() => {
      refreshSession();
    }, 10000);
    return () => clearInterval(timer);
  }, [isOpen, session, refreshSession]);

  if (totalItems === 0 && !orderSuccess && (!session?.orderedItems || session.orderedItems.length === 0)) return null;

  const handleCheckout = async () => {
    if (!session) {
      alert("Please scan a table QR code to place an order.");
      return;
    }

    setIsSubmitting(true);
    try {
      const items = cart.map((item) => ({
        menu_item_id: item.id,
        qty: item.quantity,
        notes: item.notes,
      }));

      const response = await requestOrder(
        session.restaurantId,
        session.tableId,
        session.qrToken,
        items
      );

      // Handle OrderFullContext (response.order.id) or direct OrderRead (response.id)
      if (response.id || response.order?.id || response.restaurant_order_id) {
        setOrderSuccess(true);
        clearCart();
        
        // Refresh session to show new items in "Ordered" section
        await refreshSession();

        setTimeout(() => {
          setOrderSuccess(false);
          setIsOpen(false);
        }, 5000);
      } else {
        const errorMsg = response.detail || response.error || "Unknown error";
        const statusCode = Number(response.statusCode || 0);
        if (
          statusCode === 404 ||
          statusCode === 401 ||
          /not found|invalid|expired|session ended|not authenticated/i.test(String(errorMsg))
        ) {
          resetSession();
          clearCart();
          alert("This table session has ended. Please scan the table QR code again.");
          return;
        }
        console.error("Order failed details:", response);
        alert("Failed to place order: " + errorMsg);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-black text-white shadow-2xl transition-transform hover:scale-105 active:scale-95"
      >
        <ShoppingBag size={24} />
        <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-black border-2 border-white">
          {totalItems}
        </span>
      </button>

      {/* Cart Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-500" 
            onClick={() => !isSubmitting && setIsOpen(false)} 
          />
          
          <div className="relative h-full w-full max-w-md bg-white/95 font-body backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.3)] animate-in slide-in-from-right duration-500 ease-out flex flex-col overflow-hidden border-l border-white/20">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100/50 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
              <div>
                <h2 className="font-display text-2xl font-bold text-gray-900 tracking-tight">Your Order</h2>
                {session && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                    <Utensils size={10} strokeWidth={3} />
                    {session.tableName} • {session.restaurantName || "Restaurant"}
                  </p>
                )}
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-all active:scale-90"
              >
                <X size={24} strokeWidth={2.5} />
              </button>
            </div>

            {/* Success State */}
            {orderSuccess ? (
              <div className="flex h-[60vh] flex-col items-center justify-center p-10 text-center animate-in fade-in zoom-in duration-500">
                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 shadow-inner">
                   <Send size={48} strokeWidth={1.5} className="animate-bounce" />
                </div>
                <h3 className="font-display text-3xl font-bold text-gray-900 tracking-tight">Order Received!</h3>
                <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                  We&apos;ve sent your request to the kitchen. <br/>A waiter will be with you shortly.
                </p>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="font-display mt-10 w-full rounded-2xl bg-black px-6 py-4.5 font-semibold text-white shadow-xl shadow-black/10 hover:shadow-black/20 hover:-translate-y-0.5 transition-all"
                >
                  Back to Menu
                </button>
              </div>
            ) : (
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-10 scrollbar-hide">
                  {/* Current Cart Items (Drafts) */}
                  {cart.length > 0 && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <ShoppingCart size={14} className="text-gray-400" />
                           <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">In your cart</h3>
                        </div>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Draft</span>
                      </div>
                      
                      <div className="space-y-4">
                        {cart.map((item) => (
                          <div key={item.id} className="group relative flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300">
                            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white">
                              {item.image ? (
                                <Image
                                  src={getImageUrl(item.image)!}
                                  alt={item.name}
                                  fill
                                  sizes="80px"
                                  unoptimized={item.image.startsWith('/')}
                                  className="object-contain p-1.5"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-3xl opacity-20">🍽️</div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h4 className="font-display mb-1 truncate text-base font-semibold leading-tight text-gray-900">{item.name}</h4>
                              <p className="text-sm font-semibold text-black">NPR {item.price}</p>
                            </div>

                            <div className="flex items-center gap-4 bg-gray-50 p-1.5 rounded-full border border-gray-100 shadow-inner">
                              <button 
                                onClick={() => updateQuantity(item.id, -1)}
                                className="h-8 w-8 flex items-center justify-center rounded-full bg-white text-gray-900 shadow-sm hover:bg-gray-900 hover:text-white transition-all active:scale-90"
                              >
                                <Minus size={16} strokeWidth={3} />
                              </button>
                              <span className="w-4 text-center text-sm font-semibold text-gray-900">{item.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(item.id, 1)}
                                className="h-8 w-8 flex items-center justify-center rounded-full bg-white text-gray-900 shadow-sm hover:bg-gray-900 hover:text-white transition-all active:scale-90"
                              >
                                <Plus size={16} strokeWidth={3} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Already Ordered Items (Persistence) */}
                  {session?.orderedItems && session.orderedItems.length > 0 && (
                    <div className="space-y-6 pt-2">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <Utensils size={14} className="text-amber-500" />
                           <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-600/80">Ordered</h3>
                        </div>
                        <span className="flex items-center gap-1.5 rounded-full border border-emerald-100/50 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                          <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        {session.orderedItems.map((item, idx) => (
                          <div key={`${item.id}-${idx}`} className="flex items-center gap-4 bg-white/50 p-3 rounded-2xl border border-gray-100/60 shadow-sm">
                            {/* Premium Quantity + Image Container */}
                            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white">
                              {item.image ? (
                                <Image
                                  src={getImageUrl(item.image)!}
                                  alt={item.name}
                                  fill
                                  sizes="56px"
                                  unoptimized={item.image.startsWith('/')}
                                  className="object-contain p-1"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-zinc-50 text-emerald-600/30">
                                  <Utensils size={20} strokeWidth={1.5} />
                                </div>
                              )}
                              
                              {/* Perfectly Stylized Badge */}
                              <div className="absolute -top-1 -right-1 flex h-6.5 w-6.5 items-center justify-center rounded-full bg-black text-[10px] font-black text-white shadow-lg border-2 border-white ring-1 ring-black/5">
                                {item.quantity}
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-3">
                                    <h4 className="font-display truncate text-sm font-semibold leading-tight text-gray-800">{item.name}</h4>
                                    <span className="shrink-0 rounded-md border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 shadow-xs">
                                        {['requested', 'pending', 'preparing', 'running', 'ready', 'scheduled'].includes(item.status) ? 'Ordered' : 'Done'}
                                    </span>
                                </div>
                                {item.notes && <p className="text-[10px] text-gray-400 font-medium italic mt-1 truncate">&quot;{item.notes}&quot;</p>}
                                {(Number((item as any).unit_price ?? 0) > 0 || Number(orderedMenuPriceMap[Number(item.menu_item_id)] ?? 0) > 0) && (
                                  <p className="mt-1 text-xs font-semibold text-gray-500">
                                    NPR {(Number((item as any).unit_price ?? orderedMenuPriceMap[Number(item.menu_item_id)] ?? 0)) * Number(item.quantity ?? 0)}
                                  </p>
                                )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {cart.length === 0 && (!session?.orderedItems || session.orderedItems.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-24 text-gray-300">
                      <div className="h-20 w-20 rounded-full bg-gray-50 flex items-center justify-center mb-6">
                        <ShoppingBag size={40} strokeWidth={1} className="opacity-40 text-gray-400" />
                      </div>
                      <p className="font-display text-sm font-semibold tracking-tight text-gray-400">Your cart is empty</p>
                      <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-gray-300">Waiting for your treats</p>
                    </div>
                  )}
                </div>

                {/* Footer with Glass Effect */}
                {(cart.length > 0 || orderedTotal > 0) && (
                  <div className="border-t border-gray-100/60 bg-white/70 backdrop-blur-md p-6 sm:p-8 space-y-6 shadow-[0_-15px_30px_rgba(0,0,0,0.03)]">
                    <div className="space-y-2">
                      {orderedTotal > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold uppercase tracking-wide text-gray-400">Ordered Total</span>
                          <span className="font-semibold text-gray-700">NPR {orderedTotal}</span>
                        </div>
                      )}
                      {draftTotal > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold uppercase tracking-wide text-gray-400">Draft Total</span>
                          <span className="font-semibold text-gray-700">NPR {draftTotal}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Grand Total</span>
                        <div className="text-right">
                          <span className="text-[10px] block font-semibold text-gray-400 -mb-1">NPR</span>
                          <span className="font-display text-4xl font-bold text-gray-900 tracking-tight">{grandTotal}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleCheckout}
                      disabled={isSubmitting || cart.length === 0}
                      className="font-display group flex w-full items-center justify-center gap-3 rounded-2xl bg-black py-5 text-center font-semibold text-white shadow-2xl shadow-black/20 transition-all hover:bg-zinc-800 active:scale-95 disabled:bg-gray-300 disabled:shadow-none"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-6 w-6 animate-spin" />
                          <span className="text-xs uppercase tracking-wide">Sending Request</span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs uppercase tracking-wide">Place Order</span>
                          <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </>
                      )}
                    </button>
                    {!session && (
                        <p className="rounded-lg border border-amber-100/40 bg-amber-50/30 py-2 text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-amber-600/70">
                            Scan QR at table to secure your order
                        </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
