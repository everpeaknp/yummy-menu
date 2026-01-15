/**
 * Restaurant slug to ID mapping
 * Add your restaurants here with friendly URL slugs
 * The system will also attempt to match by actual restaurant name from the API
 */

export const RESTAURANT_SLUGS: Record<string, number> = {
  // Example mappings - update these with your actual restaurants
  'demo': 52,
  'yummy': 52,
  'yummy-restaurant': 52,
  'main-branch': 52,
  // Add more mappings as needed
};

/**
 * Converts a string to a URL-friendly slug
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Attempts to find restaurant ID from slug
 * First checks static mapping, then tries to fetch by name
 */
export async function getRestaurantIdFromSlug(slug: string): Promise<number | null> {
  // First, check static mapping
  const staticId = RESTAURANT_SLUGS[slug.toLowerCase()];
  if (staticId) {
    return staticId;
  }

  // If no static mapping, try to find by fetching restaurants
  // This attempts common restaurant IDs and checks if their slugified name matches
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://yummy-321287803064.asia-south1.run.app';
  
  // Try a range of IDs (1-100 to cover more restaurants)
  for (let id = 1; id <= 100; id++) {
    try {
      const res = await fetch(`${API_URL}/restaurants/${id}`, {
        next: { revalidate: 3600 } // Cache for 1 hour
      });
      
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        
        if (data.name) {
          const restaurantSlug = slugify(data.name);
          if (restaurantSlug === slug.toLowerCase()) {
            return id;
          }
        }
      }
    } catch (error) {
      // Continue to next ID
      continue;
    }
  }
  
  return null;
}

export function getSlugFromRestaurantId(id: number): string | null {
  const entry = Object.entries(RESTAURANT_SLUGS).find(([_, restaurantId]) => restaurantId === id);
  return entry ? entry[0] : null;
}
