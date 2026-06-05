"use client";

import { X, Receipt, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getImageUrl } from "@/services/api";
import Image from "next/image";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
}

export default function ReceiptModal({ isOpen, onClose, session }: ReceiptModalProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      const timer = setTimeout(() => setIsMounted(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!session || (!isOpen && !isMounted)) return null;

  const orderedItems = session.orderedItems || [];
  const grandTotal = session.activeOrderTotal || 0;
  
  if (orderedItems.length === 0) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-400 ${isOpen ? 'visible' : 'invisible delay-400'}`}>
      {/* Overlay */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-400 ease-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      
      {/* Receipt Ticket Content */}
      <div 
        className={`relative w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-12 scale-95 opacity-0'}`}
      >
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center justify-center pt-2 pb-6 text-center border-b-2 border-dashed border-gray-200">
           <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 mb-3">
             <Receipt size={24} />
           </div>
           <h2 className="text-xl font-bold text-gray-900">{session.restaurantName || "Restaurant"}</h2>
           <p className="text-sm font-medium text-gray-500 mt-1">{session.tableName}</p>
        </div>

        {/* Items List */}
        <div className="py-6 max-h-[50vh] overflow-y-auto no-scrollbar space-y-4">
           {orderedItems.map((item: any, idx: number) => {
             const unitPrice = Number(item.unit_price || 0);
             const lineTotal = Number(item.line_total || (unitPrice * Number(item.quantity || 1)) || 0);
             
             return (
               <div key={`${item.id}-${idx}`} className="flex items-start justify-between">
                 <div className="flex items-start gap-3 flex-1 pr-4">
                   <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gray-100 text-xs font-bold text-gray-700">
                     {item.quantity}x
                   </div>
                   <div className="flex flex-col">
                     <span className="font-semibold text-gray-900 leading-tight">{item.name}</span>
                     {item.notes && <span className="text-[10px] text-gray-400 mt-0.5 line-clamp-1 italic">{item.notes}</span>}
                     <span className="text-[10px] uppercase font-bold text-emerald-500 mt-1 tracking-wider bg-emerald-50 w-fit px-1.5 py-0.5 rounded">
                       {item.status === 'completed' ? 'Done' : 'Ordered'}
                     </span>
                   </div>
                 </div>
                 {lineTotal > 0 && (
                   <span className="font-bold text-gray-900 shrink-0">NPR {lineTotal}</span>
                 )}
               </div>
             );
           })}
        </div>

        {/* Footer Totals */}
        <div className="pt-5 border-t-2 border-dashed border-gray-200">
           <div className="flex justify-between items-end">
             <span className="text-sm font-bold uppercase tracking-wider text-gray-500">Grand Total</span>
             <span className="text-3xl font-black tracking-tighter text-gray-900">NPR {grandTotal}</span>
           </div>
        </div>

        <div className="mt-8 flex justify-center">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
              <CheckCircle2 size={14} className="text-emerald-500" />
              Thank you for dining with us!
            </p>
        </div>
      </div>
    </div>
  );
}
