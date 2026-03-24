"use client";

import { useCart } from "@/context/CartContext";
import { Utensils, XCircle } from "lucide-react";

export default function TableBanner() {
  const { session, resetSession } = useCart();

  if (!session) return null;

  return (
    <div className="bg-amber-500 py-2.5 sm:py-3 text-black font-black uppercase tracking-[0.2em] text-[8px] sm:text-[10px] sticky top-0 z-[50] shadow-xl border-b border-black/10">
      <div className="mx-auto max-w-7xl px-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-4 overflow-hidden">
          <Utensils size={14} strokeWidth={3} className="shrink-0" />
          <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
            <span>Table {session.tableName}</span>
            <span className="opacity-40">•</span>
            <span className="truncate">{session.restaurantName}</span>
          </div>
        </div>
        
        <button 
          onClick={() => {
            if (confirm("Exit table session and order for self?")) {
              resetSession();
            }
          }}
          className="flex items-center gap-1.5 hover:opacity-60 transition-opacity pl-4"
        >
          <XCircle size={14} strokeWidth={3} />
          <span className="hidden sm:inline">Exit</span>
        </button>
      </div>
    </div>
  );
}
