
import MenuGrid from "@/components/MenuGrid";
import TableBanner from "@/components/TableBanner";
import { getGroupedMenu, getRestaurant } from "@/services/api";
import { slugify } from "@/config/restaurants";
import { Metadata } from "next";

interface PageProps {
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

export default async function RestaurantIdPage({ params }: PageProps) {
  const { slug: id, name } = params; // Remap slug->id, name->name for clarity
  
  // Parallel Fetching
  const [restaurant, categories] = await Promise.all([
    getRestaurant(id),
    getGroupedMenu(id),
  ]);

  // 1. Critical Failure: Restaurant validation
  if (!restaurant) {
     return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Restaurant Not Found</h1>
            <p className="mt-2 text-gray-500">
              Could not fetch details for restaurant ID {id}.
            </p>
            <p className="mt-1 text-xs text-gray-400">
               (Check server logs for fetch errors)
            </p>
          </div>
        </div>
      );
  }

  // 2. Strict Slug Match
  const expectedSlug = slugify(restaurant.name);
  if (expectedSlug !== name) {
     return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Restaurant Mismatch</h1>
            <p className="mt-2 text-gray-500">
               The restaurant name does not match the ID.
            </p>
             <p className="mt-4 text-sm text-gray-400">
                Did you mean: <a href={`/${id}/${expectedSlug}`} className="text-primary-600 hover:underline">/{id}/{expectedSlug}</a>?
            </p>
          </div>
        </div>
      );
  }

  // Debug: Verify cover image from API
  console.log(`[Page Debug] Restaurant: ${restaurant.name}, Cover Image: ${restaurant.cover_image || 'None (Using Fallback)'}`);

  return (
    <>
        <TableBanner />
        <MenuGrid initialCategories={categories} restaurantId={id} restaurant={restaurant} />
    </>
  );
}
