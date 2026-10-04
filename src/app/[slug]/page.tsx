import MenuGrid from "@/components/MenuGrid";
import { getGroupedMenu, getRestaurant } from "@/services/api";
import { getRestaurantIdFromSlug } from "@/config/restaurants";

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
    <main>
        <MenuGrid initialCategories={categories} restaurantId={restaurantId.toString()} restaurant={displayRestaurant} />
    </main>
  );
}
