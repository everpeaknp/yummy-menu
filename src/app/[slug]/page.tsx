import { redirect } from 'next/navigation';
import { getRestaurantIdFromSlug, slugify } from '@/config/restaurants';
import { getRestaurant } from '@/services/api';

export default async function RestaurantMenuPage({ params, searchParams }: { params: { slug: string }; searchParams: Record<string, string | string[] | undefined> }) {
  const id = await getRestaurantIdFromSlug(params.slug);
  const restaurant = id ? await getRestaurant(String(id)) : null;
  if (!restaurant) return <main className="grid min-h-[100dvh] place-items-center p-5 text-center"><div><h1 className="text-xl font-bold">Restaurant unavailable</h1><p className="mt-2 text-sm text-stone-500">Please check the link or ask the restaurant team for help.</p></div></main>;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) if (typeof value === 'string') query.set(key, value);
  redirect(`/${id}/${slugify(restaurant.name)}${query.size ? `?${query}` : ''}`);
}
