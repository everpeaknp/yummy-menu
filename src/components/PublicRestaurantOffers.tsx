"use client";

import useSWR from "swr";
import { useId } from "react";
import { Gift } from "lucide-react";
import { getPublicRestaurantOffers, type CustomerProgram } from "@/services/api";
import { useCart } from "@/context/CartContext";
import { money } from "@/lib/money";

function condition(offer: CustomerProgram): string {
  if (offer.goal_kind === "order_item_qty") return `Buy ${offer.goal_quantity} × ${offer.goal_item_name || "qualifying item"} in one order`;
  return `Spend ${money(offer.goal_min_spend || 0)} in one order`;
}

function reward(offer: CustomerProgram): string {
  if (offer.reward_kind === "free_item") return `${offer.reward_quantity} × ${offer.reward_item_name || "menu item"} free`;
  if (offer.reward_kind === "fixed") return `${money(offer.reward_value || 0)} off`;
  return `${offer.reward_value}% off, up to ${money(offer.percentage_cap || 0)}`;
}

export default function PublicRestaurantOffers({ restaurantId, excludeIds = [] }: { restaurantId: number; excludeIds?: number[] }) {
  const titleId = useId();
  const { cart, totalPrice } = useCart();
  const { data: offers, error, mutate } = useSWR(
    restaurantId > 0 ? ["public-restaurant-offers", restaurantId] : null,
    () => getPublicRestaurantOffers(restaurantId),
    { revalidateOnFocus: true },
  );
  const visibleOffers = offers?.filter(offer => !excludeIds.includes(offer.id));
  if (!visibleOffers?.length && !error) return null;
  return <section aria-labelledby={titleId} className="mb-7">
    <h2 id={titleId} className="customer-section-title mb-3">Restaurant offers</h2>
    {error ? <div className="customer-card flex flex-wrap items-center justify-between gap-3 p-4 text-sm"><p>Offers could not be loaded.</p><button type="button" onClick={() => void mutate()} className="min-h-11 font-semibold text-orange-700 hover:text-orange-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Retry</button></div> :
      <div className="customer-card divide-y divide-stone-200">{visibleOffers?.map(offer => {
        const current = offer.goal_kind === "order_item_qty"
          ? cart.filter(line => line.id === offer.goal_item_id).reduce((sum, line) => sum + line.quantity, 0)
          : totalPrice;
        const needed = offer.goal_kind === "order_item_qty" ? offer.goal_quantity || 0 : offer.goal_min_spend || 0;
        return <article key={offer.id} className="flex items-start gap-3 p-4 sm:p-5">
          <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-700"><Gift size={19} /></span>
          <div className="min-w-0 flex-1"><h3 className="break-words font-semibold text-stone-950">{offer.name}</h3><p className="mt-1 break-words text-sm text-stone-600">{condition(offer)}</p><div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><p className="break-words text-sm font-semibold text-orange-700">Get {reward(offer)}</p>{cart.length > 0 && <span className="text-xs font-medium text-stone-600">{current >= needed ? "Condition met in cart" : offer.goal_kind === "order_item_qty" ? `Add ${needed - current} more` : `${money(needed - current)} more`}</span>}</div></div>
        </article>;
      })}</div>}
    <p className="mt-2 text-xs text-stone-600">Offers are checked on the final order. One reward per order.</p>
  </section>;
}
