"use client";

import { useState, useEffect } from "react";
import { MenuItem } from "@/services/api";
import { X, Plus, Check, Info } from "lucide-react";
import gsap from "gsap";

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

  useEffect(() => {
    if (isOpen) {
      setSelectedModifiers({});
      setNotes("");
      
      // Animate in
      gsap.to(".drawer-overlay", { opacity: 1, duration: 0.3 });
      gsap.to(".drawer-content", { y: 0, duration: 0.4, ease: "power2.out" });
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen]);

  const handleClose = () => {
    gsap.to(".drawer-overlay", { opacity: 0, duration: 0.3 });
    gsap.to(".drawer-content", { 
      y: "100%", 
      duration: 0.3, 
      ease: "power2.in",
      onComplete: onClose 
    });
  };

  if (!item) return null;

  const itemGroups = modifierGroups.filter(g => 
    item.modifier_group_ids?.includes(g.id)
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
    const flatModifiers = Object.values(selectedModifiers).flat().map(m => ({
        modifier_id: m.id,
        modifier_name_snapshot: m.name,
        price_adjustment_snapshot: parseFloat(m.price_adjustment || 0)
    }));
    onAddToCart(item, notes, flatModifiers);
    handleClose();
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
        className={`fixed inset-0 z-[100] flex items-end justify-center ${isOpen ? 'visible' : 'invisible'}`}
        style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
    >
      {/* Overlay */}
      <div 
        className="drawer-overlay absolute inset-0 bg-black/40 opacity-0 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Content */}
      <div className="drawer-content relative w-full max-w-xl translate-y-full rounded-t-[2.5rem] bg-white p-6 shadow-2xl transition-transform dark:bg-gray-900">
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-gray-200 dark:bg-gray-700" />
        
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{item.name}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">NPR {item.price}</p>
          </div>
          <button 
            onClick={handleClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-6 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
          {itemGroups.map(group => (
            <div key={group.id} className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 dark:text-white">
                    {group.name}
                    {group.is_required && <span className="ml-1 text-red-500">*</span>}
                </h3>
                {group.is_required && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                        Required
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
                      className={`flex w-full items-center justify-between rounded-2xl border-2 p-4 transition-all ${
                        isSelected 
                          ? 'border-black bg-black text-white' 
                          : 'border-gray-100 bg-gray-50 text-gray-900 hover:border-gray-200'
                      }`}
                    >
                      <span className="font-semibold text-sm">{mod.name}</span>
                      <div className="flex items-center gap-3">
                        {parseFloat(mod.price_adjustment) > 0 && (
                          <span className={`text-xs font-bold ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                            +NPR {mod.price_adjustment}
                          </span>
                        )}
                        <div className={`flex h-5 w-5 items-center justify-center rounded-full border ${isSelected ? 'border-white bg-white text-black' : 'border-gray-300 bg-white'}`}>
                          {isSelected && <Check size={12} strokeWidth={4} />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Notes Input */}
          <div className="mt-4">
              <h3 className="mb-3 font-bold text-gray-900 dark:text-white">Special Instructions</h3>
              <textarea
                placeholder="Ex: No onions, extra spicy, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-2xl border-2 border-gray-100 bg-gray-50 p-4 text-sm focus:border-black focus:outline-none dark:border-gray-800 dark:bg-gray-800"
                rows={3}
              />
          </div>
        </div>

        <div className="mt-8">
            <button
              onClick={handleConfirm}
              disabled={!isValid}
              className="flex w-full items-center justify-between rounded-full bg-black px-8 py-5 text-white shadow-xl transition-transform active:scale-95 disabled:bg-gray-300"
            >
              <span className="font-bold">Add to Cart</span>
              <span className="font-bold">NPR {item.price + additivePrice}</span>
            </button>
        </div>
      </div>
    </div>
  );
}
