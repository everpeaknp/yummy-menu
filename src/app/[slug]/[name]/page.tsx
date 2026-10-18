
import MenuGrid from "@/components/MenuGrid";
import { getRestaurant } from "@/services/api";
import { slugify } from "@/config/restaurants";
import { Metadata } from "next";
import { redirect } from "next/navigation";

interface PageProps {
  searchParams?: Record<string, string | string[] | undefined>;
  params: {
    slug: string; // This will act as the ID in the URL structure /ID/Name
    name: string; // This is the restaurant name slug
  };
}

export const revalidate = 3600; // Revalidate every hour
export const dynamicParams = true;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: id } = params;
  const restaurant = await getRestaurant(id);

  if (!restaurant) {
    return {
      title: "Restaurant Not Found - Yummyever Menu",
      description: "The requested restaurant could not be found.",
    };
  }

  return {
    title: `${restaurant.name} - Yummyever Menu`,
    description: `View the full digital menu for ${restaurant.name}. Check prices, browse categories, and visit us!`,
    openGraph: {
      title: `${restaurant.name} - Menu & Prices`,
      description: `View the full digital menu for ${restaurant.name} on Yummyever Menu.`,
      images: [
        {
          url: restaurant.cover_image || restaurant.logo || "/logos/yummy_logo.png",
          width: 1200,
          height: 630,
          alt: `${restaurant.name} Cover`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${restaurant.name} - Menu & Prices`,
      description: `View the full digital menu for ${restaurant.name} on Yummyever Menu.`,
      images: [restaurant.cover_image || restaurant.logo || "/logos/yummy_logo.png"],
    },
  };
}

// URL Structure: /:id/:name
// Maps to: src/app/[slug]/[name]/page.tsx
// params.slug = ID
// params.name = Name

export default async function RestaurantIdPage({ params, searchParams }: PageProps) {
  const { slug: id, name } = params; // Remap slug->id, name->name for clarity

  // Parallel Fetching
  const restaurant = await getRestaurant(id);

  // 1. Critical Failure: Restaurant validation
  if (!restaurant) {
     return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Restaurant Not Found</h1>
            <p className="mt-2 text-gray-500">
              This restaurant is currently unavailable. Please try again or ask the team for help.
            </p>
            <p className="mt-1 text-xs text-gray-400">

            </p>
          </div>
        </div>
      );
  }

  const expectedSlug = slugify(restaurant.name);
  if (expectedSlug !== name) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams || {})) {
      if (Array.isArray(value)) value.forEach(entry => query.append(key, entry));
      else if (value !== undefined) query.set(key, value);
    }
    redirect(`/${id}/${expectedSlug}${query.size ? `?${query}` : ''}`);
  }

  // Debug: Verify cover image from API
  console.log(`[Page Debug] Restaurant: ${restaurant.name}, Cover Image: ${restaurant.cover_image || 'None (Using Fallback)'}`);

  return (
    <>
        <MenuGrid restaurantId={id} restaurant={restaurant} />
    </>
  );
}
