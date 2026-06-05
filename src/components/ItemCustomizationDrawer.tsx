"use client";

import { useState, useEffect } from "react";
import { MenuItem } from "@/services/api";
import { X, Check } from "lucide-react";

interface ItemCustomizationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem | null;
  modifierGroups: any[];
  onAddToCart: (item: MenuItem, notes: string, selectedModifiers: any[]) => void;
}

export default function ItemCustomizationDrawer({
  isOpen,
  onClose,
  item,
  modifierGroups,
  onAddToCart
}: ItemCustomizationDrawerProps) {
  const [selectedModifiers, setSelectedModifiers] = useState<Record<number, any[]>>({});
  const [notes, setNotes] = useState("");
  // Local state to manage the mount status for animation
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedModifiers({});
      setNotes("");
      setIsMounted(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      // Delay unmounting to let the slide-down animation play out
      const timer = setTimeout(() => setIsMounted(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!item && !isMounted) return null;

  const itemGroups = modifierGroups.filter(g => 
    item?.modifier_group_ids?.includes(g.id)
  ).sort((a,b) => (a.display_order || 0) - (b.display_order || 0));

  const handleToggle = (groupId: number, modifier: any, max: number | null) => {
    setSelectedModifiers(prev => {
      const current = prev[groupId] || [];
      const exists = current.find(m => m.id === modifier.id);
      
      if (exists) {
        return { ...prev, [groupId]: current.filter(m => m.id !== modifier.id) };
      } else {
        if (max === 1) {
            return { ...prev, [groupId]: [modifier] };
        }
        if (max && current.length >= max) return prev;
        return { ...prev, [groupId]: [...current, modifier] };
      }
    });
  };

  const handleConfirm = () => {
    if (!item) return;
    const flatModifiers = Object.values(selectedModifiers).flat().map(m => ({
        modifier_id: m.id,
        modifier_name_snapshot: m.name,
        price_adjustment_snapshot: parseFloat(m.price_adjustment || 0)
    }));
    onAddToCart(item, notes, flatModifiers);
    onClose();
  };

  // Basic validation for required groups
  let isValid = true;
  for (const group of itemGroups) {
    if (group.is_required && (!selectedModifiers[group.id] || selectedModifiers[group.id].length === 0)) {
      isValid = false;
      break;
    }
  }

  let additivePrice = 0;
  Object.values(selectedModifiers).flat().forEach(m => {
    additivePrice += parseFloat(m.price_adjustment || 0);
  });

  return (
    <div 
        className={`fixed inset-0 z-[100] flex items-end justify-center transition-all duration-400 ${isOpen ? 'visible' : 'invisible delay-400'}`}
    >
      {/* Overlay */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-400 ease-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      
      {/* Content */}
      <div 
        className={`relative w-full max-w-xl rounded-t-[32px] bg-white p-6 pt-4 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-gray-200" />
        
        {item && (
          <div className="flex flex-col h-full max-h-[85vh]">
            {/* Header */}
            <div className="flex items-start justify-between mb-4 shrink-0">
              <div>
                <h2 className="text-[24px] font-bold tracking-tight text-gray-900">{item.name}</h2>
                <p className="mt-1 text-[15px] font-semibold text-gray-500">NPR {item.price}</p>
              </div>
              <button 
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto pr-1 pb-4 no-scrollbar flex-1">
              {itemGroups.map(group => (
                <div key={group.id} className="mb-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-[17px] font-bold text-gray-900 flex items-center">
                        {group.name}
                        {group.is_required && <span className="text-red-500 ml-1.5 text-lg leading-none">*</span>}
                    </h3>
                    {group.is_required && (
                        <span className="text-[10px] font-bold tracking-widest text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                            REQUIRED
                        </span>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {group.modifiers?.map((mod: any) => {
                      const isSelected = (selectedModifiers[group.id] || []).some(m => m.id === mod.id);
                      return (
                        <button
                          key={mod.id}
                          onClick={() => handleToggle(group.id, mod, group.max_selections)}
                          className={`flex w-full items-center justify-between rounded-2xl py-4 px-5 bg-white transition-all active:scale-[0.98] select-none border-2 ${
                            isSelected ? 'border-black shadow-sm' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <span className="font-bold text-[16px] text-gray-900 tracking-tight">{mod.name}</span>
                          <div className="flex items-center gap-3">
                            {parseFloat(mod.price_adjustment) > 0 && (
                              <span className={`text-[14px] font-bold ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>
                                +NPR {mod.price_adjustment}
                              </span>
                            )}
                            <div className={`flex h-[22px] w-[22px] items-center justify-center rounded-full transition-all ${
                              isSelected ? 'border-[6.5px] border-black bg-white' : 'border-2 border-gray-300 bg-white'
                            }`}>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Notes Input */}
              <div className="mt-8 mb-2">
                  <h3 className="mb-3 text-[16px] font-bold text-gray-900">Special Instructions</h3>
                  <textarea
                    placeholder="Ex: No onions, extra spicy, etc."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-[20px] border border-gray-200 bg-gray-50 p-5 text-[15px] text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black resize-none transition-colors"
                    rows={3}
                  />
              </div>
            </div>

            <div className="mt-6 shrink-0 pt-2 border-t border-gray-100">
                <button
                  onClick={handleConfirm}
                  disabled={!isValid}
                  className="flex w-full items-center justify-between rounded-full bg-black px-8 py-5 text-white transition-all hover:bg-gray-900 active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400"
                >
                  <span className="text-[17px] font-bold tracking-tight">Add to Cart</span>
                  <span className="text-[17px] font-bold tracking-tight">NPR {item.price + additivePrice}</span>
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

