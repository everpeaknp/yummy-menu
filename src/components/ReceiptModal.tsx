"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { getRestaurant } from "@/services/api";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
}

export default function ReceiptModal({ isOpen, onClose, session }: ReceiptModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [restaurantData, setRestaurantData] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      document.body.style.overflow = "hidden";
      
      // Fetch restaurant details dynamically when opening
      if (session?.restaurantId) {
        getRestaurant(session.restaurantId.toString()).then(data => {
          if (data) setRestaurantData(data);
        });
      }
    } else {
      document.body.style.overflow = "unset";
      const timer = setTimeout(() => setIsMounted(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, session?.restaurantId]);

  if (!session || (!isOpen && !isMounted)) return null;

  const orderedItems = session.orderedItems || [];
  const grandTotal = session.activeOrderTotal || 0;
  
  if (orderedItems.length === 0) return null;

  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-400 ${isOpen ? 'visible' : 'invisible delay-400'}`}>
      {/* Overlay */}
      <div 
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-400 ease-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      
      {/* Thermal Receipt Content */}
      <div 
        className={`relative w-full max-w-[340px] bg-[#f8f9fa] shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-12 scale-95 opacity-0'}`}
        style={{
           fontFamily: "'Courier New', Courier, monospace",
           color: "#000",
           textShadow: "0.2px 0.2px 0px rgba(0,0,0,0.2)"
        }}
      >
        {/* Receipt Edge zig-zag decoration top */}
        <div className="absolute top-[-4px] left-0 right-0 h-2 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxwb2x5Z29uIGZpbGw9IiNmOGY5ZmEiIHBvaW50cz0iMCw4IDQsMCA4LDggMCw4Ii8+PC9zdmc+')] bg-repeat-x"></div>

        <button 
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-black/50 hover:bg-black/20 hover:text-black transition-colors z-10"
        >
          <X size={16} />
        </button>

        <div className="px-5 py-8 h-full max-h-[80vh] overflow-y-auto no-scrollbar text-[13px] leading-tight">
            <div className="text-center font-bold text-[18px] tracking-widest mb-1 uppercase">{restaurantData?.name || session.restaurantName || "YUMMY"}</div>
            {restaurantData?.address && (
              <div className="text-center uppercase text-[11px] mb-1">{restaurantData.address}</div>
            )}
            {restaurantData?.phone && (
              <div className="text-center uppercase text-[11px] mb-2">Phone: {restaurantData.phone}</div>
            )}
            
            <div className="border-b-[1.5px] border-dashed border-black/80 w-full my-2"></div>
            
            <div className="flex justify-between font-semibold uppercase text-[12px]">
              <div>
                 <div>BILL #--</div>
                 <div>Order #--</div>
                 <div>Table: {session.tableName}</div>
              </div>
              <div className="text-right">
                 {currentDate}
              </div>
            </div>

            <div className="border-b-[1.5px] border-dashed border-black/80 w-full my-2"></div>

            <table className="w-full text-[12px] font-semibold uppercase">
              <thead>
                <tr className="border-b-[1.5px] border-dashed border-black/80">
                  <th className="text-left font-semibold pb-1 w-[10%]">S.N</th>
                  <th className="text-left font-semibold pb-1 w-[35%]">ITEM</th>
                  <th className="text-right font-semibold pb-1 w-[20%]">RATE</th>
                  <th className="text-right font-semibold pb-1 w-[15%]">QTY</th>
                  <th className="text-right font-semibold pb-1 w-[20%]">AMT</th>
                </tr>
              </thead>
              <tbody className="align-top">
                {orderedItems.map((item: any, idx: number) => {
                  const rate = Number(item.unit_price || 0).toFixed(2);
                  const amt = Number(item.line_total || (Number(item.unit_price || 0) * Number(item.quantity || 1))).toFixed(2);
                  return (
                    <tr key={idx}>
                      <td className="text-left py-1">{idx + 1}</td>
                      <td className="text-left py-1 pr-1 break-words">{item.name}</td>
                      <td className="text-right py-1">{rate}</td>
                      <td className="text-right py-1">{item.quantity}</td>
                      <td className="text-right py-1">{amt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="border-b-2 border-double border-black/90 w-full mt-2 mb-1"></div>
            <div className="border-b-2 border-double border-black/90 w-full mb-2"></div>
            
            <div className="flex justify-between font-bold text-[14px] uppercase mb-2">
                <span>TOTAL</span>
                <span>Rs. {Number(grandTotal).toFixed(2)}</span>
            </div>
            
            <div className="border-b-[1.5px] border-dashed border-black/80 w-full mb-3"></div>

            <div className="flex justify-between font-bold text-[15px] mb-2">
                <span>Paid:</span>
                <span>Rs. 0.00</span>
            </div>
            <div className="flex justify-between font-bold text-[15px] mb-4">
                <span>Due:</span>
                <span>Rs. {Number(grandTotal).toFixed(2)}</span>
            </div>

            <div className="border-b-[1.5px] border-dashed border-black/80 w-full my-4"></div>

            <div className="text-center text-[11px] mb-6 tracking-widest">
                THANK YOU
            </div>
        </div>

        {/* Receipt Edge zig-zag decoration bottom */}
        <div className="absolute bottom-[-4px] left-0 right-0 h-2 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxwb2x5Z29uIGZpbGw9IiNmOGY5ZmEiIHBvaW50cz0iMCwwIDQsOCA4LDAgMCwwIi8+PC9zdmc+')] bg-repeat-x"></div>
      </div>
    </div>
  );
}
