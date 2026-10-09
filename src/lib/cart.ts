import type { MenuItem } from '@/services/api';

export interface CartLine extends MenuItem {
  lineId: string;
  restaurantId: number;
  quantity: number;
  notes?: string;
  modifiers?: { modifier_id: number; modifier_name_snapshot: string; price_adjustment_snapshot: number }[];
}

export function addCartLine(lines: CartLine[], item: MenuItem, notes = '', modifiers: CartLine['modifiers'] = [], restaurantId = 0): CartLine[] {
  const lineId = JSON.stringify([restaurantId, item.id, notes.trim(), modifiers.map(m => m.modifier_id).sort((a, b) => a - b)]);
  const existing = lines.find(line => line.lineId === lineId);
  return existing
    ? lines.map(line => line.lineId === lineId ? { ...line, quantity: line.quantity + 1 } : line)
    : [...lines, { ...item, lineId, restaurantId, notes: notes.trim(), modifiers, quantity: 1 }];
}

export function changeLineQuantity(lines: CartLine[], lineId: string, delta: number): CartLine[] {
  return lines.map(line => line.lineId === lineId ? { ...line, quantity: Math.max(0, line.quantity + delta) } : line).filter(line => line.quantity > 0);
}

export function changeLineNotes(lines: CartLine[], lineId: string, notes: string): CartLine[] {
  const target = lines.find(line => line.lineId === lineId);
  if (!target) return lines;
  const nextId = JSON.stringify([target.restaurantId, target.id, notes.trim(), (target.modifiers || []).map(m => m.modifier_id).sort((a, b) => a - b)]);
  const matching = lines.find(line => line.lineId === nextId && line.lineId !== lineId);
  return matching
    ? lines.filter(line => line.lineId !== lineId).map(line => line.lineId === nextId ? { ...line, quantity: line.quantity + target.quantity } : line)
    : lines.map(line => line.lineId === lineId ? { ...line, lineId: nextId, notes: notes.trim() } : line);
}

export function cartUnitPrice(line: CartLine): number {
  return Number(line.price) + (line.modifiers || []).reduce((sum, modifier) => sum + Number(modifier.price_adjustment_snapshot || 0), 0);
}

export function cartTotal(lines: CartLine[]): number {
  return Math.round(lines.reduce((sum, line) => sum + cartUnitPrice(line) * line.quantity, 0) * 100) / 100;
}

export function shouldEndTableSession(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 410;
}
