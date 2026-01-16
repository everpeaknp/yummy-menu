import MenuGrid from "@/components/MenuGrid";
import { getGroupedMenu, getRestaurant } from "@/services/api";
import { getRestaurantIdFromSlug } from "@/config/restaurants";
import Image from "next/image";
import { MapPin, Phone, Utensils } from "lucide-react";

interface PageProps {
  params: {
    slug: string;
  };
}

export const revalidate = 3600; // Revalidate every hour

export default async function RestaurantMenuPage({ params }: PageProps) {
  const { slug } = params;
  
  // Resolve slug to restaurant ID (now supports dynamic API lookup)
  const restaurantId = await getRestaurantIdFromSlug(slug);
  
  if (!restaurantId) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Restaurant Not Found</h1>
          <p className="mt-2 text-gray-500">
            The restaurant &quot;{slug}&quot; does not exist or is not configured.
          </p>
        </div>
      </div>
    );
  }
  
  // Parallel Fetching
  const [restaurant, categories] = await Promise.all([
    getRestaurant(restaurantId.toString()),
    getGroupedMenu(restaurantId.toString()),
  ]);

  if (!categories || categories.length === 0) {
      if (!restaurant) {
          // Both failed or empty
           return (
              <div className="flex h-screen items-center justify-center bg-gray-50">
                  <div className="text-center">
                      <h1 className="text-2xl font-bold text-gray-900">Menu Not Found</h1>
                      <p className="mt-2 text-gray-500">Could not load menu data for this restaurant.</p>
                  </div>
              </div>
          );
      }
      // Restaurant loaded but no menu
      // Continue to render page with empty menu message handled by MenuGrid
  }

  // Fallback for restaurant details if API fails (e.g. 401 Unauthorized)
  // Try to use a generic name based on the slug
  const displayRestaurant = restaurant || {
      id: restaurantId,
      name: slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      address: undefined,
      phone: undefined,
      logo: undefined
  };

  return (
    <main className="min-h-screen bg-white">
        {/* Hero Header */}
        <div className="relative h-48 w-full bg-gray-900 sm:h-64 overflow-hidden">
            {/* Background Image / Pattern */}
            <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ 
                    backgroundImage: displayRestaurant.cover_image ? `url('${displayRestaurant.cover_image}')` : undefined,
                    opacity: 0.6
                }} 
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

            <div className="absolute bottom-0 left-0 w-full p-4 sm:p-6 lg:p-8">
                 <div className="mx-auto max-w-7xl flex items-center gap-4">
                    {/* Logo */}
                    <div className="h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-xl border-4 border-white bg-white shadow-lg shrink-0 flex items-center justify-center">
                         {displayRestaurant.logo ? (
                            <Image 
                                src={displayRestaurant.logo} 
                                alt={displayRestaurant.name} 
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
                            {displayRestaurant.name}
                        </h1>
                        <p className="text-xs font-medium text-white/80 mt-1 tracking-wide uppercase">
                            Menu
                        </p>
                        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-y-1 sm:gap-x-4 text-xs text-gray-200 font-medium mt-2">
                            {displayRestaurant.address && (
                                <div className="flex items-center gap-1">
                                    <MapPin size={12} className="text-primary-400 shrink-0" />
                                    <span className="line-clamp-1">{displayRestaurant.address}</span>
                                </div>
                            )}
                            {displayRestaurant.phone && (
                                <div className="flex items-center gap-1">
                                    <Phone size={12} className="text-primary-400 shrink-0" />
                                    <span>{displayRestaurant.phone}</span>
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
