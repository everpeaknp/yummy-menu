import type { QRTableContext } from '@/services/api';

type Item = NonNullable<QRTableContext['ordered_items']>[number];
const money = (amount: number) => new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 2 }).format(amount);
const lineTotal = (item: Item) => Number(item.line_total ?? Number(item.unit_price || 0) * item.quantity);
const statuses: Record<string, string> = { requested: 'Awaiting acceptance', pending: 'Accepted', preparing: 'Preparing', running: 'In progress', ready: 'Ready', scheduled: 'Scheduled', completed: 'Completed', canceled: 'Cancelled', cancelled: 'Cancelled' };

export default function OrderedBillItems({ items }: { items: Item[] }) {
  const yours = items.filter(item => item.is_yours === true);
  const friends = new Map<string, { name: string; items: Item[] }>();
  for (const item of items.filter(item => item.is_yours !== true)) {
    const key = item.bill_customer_id != null ? String(item.bill_customer_id) : 'unknown';
    const group = friends.get(key) || { name: item.bill_customer_name?.trim() || 'Table companion', items: [] };
    group.items.push(item);
    friends.set(key, group);
  }
  const groups = [{ name: 'Your items', items: yours }, ...Array.from(friends.values())];
  return <div className="divide-y divide-stone-200">
    {groups.map((group, index) => <section key={index} className="py-4 first:pt-1 last:pb-0" aria-label={index === 0 ? 'Your items' : `${group.name}’s bill`}>
      <div className="flex items-start justify-between gap-3">
        <h4 className="min-w-0 break-words text-sm font-semibold">{index === 0 ? group.name : `${group.name}’s items`}</h4>
        {group.items.length > 0 && <p className="shrink-0 text-sm font-semibold tabular-nums">{money(group.items.reduce((sum, item) => sum + lineTotal(item), 0))}</p>}
      </div>
      <p className="mt-1 text-xs text-stone-500">{index === 0 ? 'Items on your bill. Pending requests are estimates.' : 'Separate bill. Not included in your payment.'}</p>
      {!group.items.length && <p className="py-4 text-sm text-stone-600">You haven’t sent any items yet.</p>}
      <ul className="divide-y divide-stone-100">{group.items.map(item => <li key={item.id} className="flex items-start gap-3 py-4">
        <span className="grid h-8 min-w-8 place-items-center rounded-lg bg-stone-100 text-xs font-semibold tabular-nums">{item.quantity}×</span>
        <div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{item.name}</p><p className={`mt-1 text-xs ${item.status === 'requested' ? 'text-orange-700' : 'text-stone-500'}`}>{statuses[item.status] || item.status}</p>{item.notes && <p className="mt-1 break-words text-xs text-stone-500">{item.notes}</p>}</div>
        <p className="shrink-0 text-sm font-medium tabular-nums">{money(lineTotal(item))}</p>
      </li>)}</ul>
    </section>)}
  </div>;
}
