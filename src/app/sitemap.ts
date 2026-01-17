import { MetadataRoute } from "next";
import { getAllRestaurants } from "@/services/api";
import { slugify } from "@/config/restaurants";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://menu.yummyever.com";
  
  // 1. Static Routes
  const routes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1,
    },
  ];

  // 2. Dynamic Restaurant Routes
  const restaurants = await getAllRestaurants();
  
  const restaurantRoutes = restaurants.map((restaurant) => {
    const slug = slugify(restaurant.name);
    return {
      url: `${baseUrl}/${restaurant.id}/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    };
  });

  return [...routes, ...restaurantRoutes];
}
