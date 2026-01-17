
import MenuGrid from "@/components/MenuGrid";
import { getGroupedMenu, getRestaurant } from "@/services/api";
import { slugify } from "@/config/restaurants";
import Image from "next/image";
import { MapPin, Phone, Utensils } from "lucide-react";
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
    <main className="min-h-screen bg-white">
        {/* Hero Header */}
        <div className="relative h-48 w-full bg-gray-900 sm:h-64 overflow-hidden">
            {/* Background Image / Pattern */}
            <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ 
                    backgroundImage: restaurant.cover_image ? `url('${restaurant.cover_image}')` : undefined,
                    opacity: 0.6
                }} 
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

            <div className="absolute bottom-0 left-0 w-full p-4 sm:p-6 lg:p-8">
                 <div className="mx-auto max-w-7xl flex items-center gap-4">
                    {/* Logo */}
                    <div className="h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-xl border-4 border-white bg-white shadow-lg shrink-0 flex items-center justify-center">
                         {restaurant.logo ? (
                            <Image 
                                src={restaurant.logo} 
                                alt={restaurant.name} 
                                width={112} 
                                height={112} 
                                className="h-full w-full object-cover"
                            />
                         ) : (
                             <div className="h-full w-full flex items-center justify-center bg-primary-50 text-2xl font-bold text-gray-400">
                                <Utensils />
                             </div>
                         )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 pb-1 text-white">
                        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white shadow-sm leading-tight">
                            {restaurant.name}
                        </h1>
                        <p className="text-xs font-medium text-white/80 mt-1 tracking-wide uppercase">
                            Menu
                        </p>
                        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-y-1 sm:gap-x-4 text-xs text-gray-200 font-medium mt-2">
                            {restaurant.address && (
                                <div className="flex items-center gap-1">
                                    <MapPin size={12} className="text-primary-400 shrink-0" />
                                    <span className="line-clamp-1">{restaurant.address}</span>
                                </div>
                            )}
                            {restaurant.phone && (
                                <div className="flex items-center gap-1">
                                    <Phone size={12} className="text-primary-400 shrink-0" />
                                    <span>{restaurant.phone}</span>
                                </div>
                            )}
                        </div>
                    </div>
                 </div>
            </div>
        </div>

        <MenuGrid categories={categories} />
    </main>
  );
}
