"use client";

import useSWR from "swr";
import { useId } from "react";
import Image from "next/image";
import { Gift } from "lucide-react";
import { getGroupedMenu, getModifierGroups, getPublicRestaurantOffers, type CustomerProgram } from "@/services/api";
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

export default function PublicRestaurantOffers({ restaurantId, excludeIds = [], showEmpty = false }: { restaurantId: number; excludeIds?: number[]; showEmpty?: boolean }) {
  const titleId = useId();
  const { cart, totalPrice } = useCart();
  const { data: offers, error, mutate } = useSWR(
    restaurantId > 0 ? ["public-restaurant-offers", restaurantId] : null,
    () => getPublicRestaurantOffers(restaurantId),
    { revalidateOnFocus: true },
  );
  const { data: menuData } = useSWR(offers?.some(offer => offer.reward_item_id || offer.goal_item_id) ? `customer-menu-${restaurantId}` : null, async () => {
    const [categories, modifierGroups] = await Promise.all([getGroupedMenu(String(restaurantId)), getModifierGroups(String(restaurantId))]);
    return { categories, modifierGroups };
  }, { revalidateOnFocus: false });
  const menuItems = menuData?.categories.flatMap(category => category.items) || [];
  const visibleOffers = offers?.filter(offer => !excludeIds.includes(offer.id));
  if (!showEmpty && !visibleOffers?.length && !error) return null;
  return <section aria-labelledby={titleId}>
    <h2 id={titleId} className="mb-3 font-display text-xl font-semibold tracking-tight text-[#20242b]">Restaurant offers</h2>
    {error ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-[#eee5de] bg-white p-4 text-sm"><p>Offers could not be loaded.</p><button type="button" onClick={() => void mutate()} className="min-h-11 font-semibold text-[#9c2b0c] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8320d]">Retry</button></div> : !offers ? <div role="status" aria-label="Loading restaurant offers" className="h-28 animate-pulse rounded-[1.25rem] bg-[#f3e6dc] motion-reduce:animate-none" /> : !visibleOffers?.length ? <p className="rounded-[1.25rem] border border-[#eee5de] bg-white p-4 text-sm text-[#606773]">{excludeIds.length ? "No other restaurant offers right now." : "No restaurant offers right now."}</p> :
      <div className="space-y-3">{visibleOffers.map(offer => {
        const current = offer.goal_kind === "order_item_qty"
          ? cart.filter(line => line.id === offer.goal_item_id).reduce((sum, line) => sum + line.quantity, 0)
          : totalPrice;
        const needed = offer.goal_kind === "order_item_qty" ? offer.goal_quantity || 0 : offer.goal_min_spend || 0;
        const itemImage = menuItems.find(item => item.id === offer.reward_item_id)?.image || menuItems.find(item => item.id === offer.goal_item_id)?.image;
        return <article key={offer.id} className="flex items-start gap-3 rounded-[1.25rem] border border-[#eee5de] bg-white p-4 sm:p-5">
          <span aria-hidden="true" className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#fff0e5] text-[#9c2b0c]">{itemImage ? <Image src={itemImage} alt="" fill unoptimized sizes="44px" className="object-cover" /> : <Gift size={20} />}</span>
          <div className="min-w-0 flex-1"><h3 className="break-words font-semibold leading-6 text-[#20242b]">{offer.name}</h3><p className="mt-1 break-words text-sm leading-5 text-[#505761]">{condition(offer)}</p><p className="mt-2 break-words text-sm font-semibold text-[#9c2b0c]">Get {reward(offer)}</p>{cart.length > 0 && <p className="mt-2 text-xs font-medium text-[#505761]">{current >= needed ? "Condition met in cart" : offer.goal_kind === "order_item_qty" ? `Add ${needed - current} more` : `${money(needed - current)} more`}</p>}</div>
        </article>;
      })}</div>}
    {Boolean(visibleOffers?.length) && <p className="mt-3 text-xs leading-5 text-[#505761]">Offers are checked on the final order. One reward per order.</p>}
  </section>;
}
