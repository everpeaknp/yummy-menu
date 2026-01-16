const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://yummy-321287803064.asia-south1.run.app';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nrrfumuslekbdjvgklqp.supabase.co';
// Debug log to trace what path is coming in
const getImageUrl = (path?: string) => {
    // console.log(`[Image Debug] Input: ${path}`);
    if (!path) return undefined;
    if (path.startsWith('http')) return path;
    if (path.startsWith('asset:')) {
        const navPath = path.replace('asset:', '');
        const cleanPath = navPath.startsWith('/') ? navPath : `/${navPath}`;
        // console.log(`[Image Debug] Output (Local): ${cleanPath}`);
        return cleanPath;
    }
    return path;
}

export interface MenuCategoryGroup {
  id: number;
  name: string;
  description?: string;
  image?: string;
  items: MenuItem[];
}

export interface MenuItem {
  id: number;
  name: string;
  description?: string;
  price: number;
  image?: string;
  is_available: boolean;
  dietary_info?: string[]; // e.g., 'veg', 'non-veg', 'gluten-free'
  category_type?: string; // e.g. 'kitchen', 'bar', 'cafe'
}

export interface Restaurant {
  id: number;
  name: string;
  address?: string;
  logo?: string;
  cover_image?: string;
  phone?: string;
}

export const getRestaurant = async (id: string): Promise<Restaurant | null> => {
  try {
    const url = `${API_URL}/restaurants/${id}`;
    // console.log(`[DEBUG] Fetching restaurant from: ${url}`);
    const res = await fetch(url);
    // console.log(`[DEBUG] Response status: ${res.status}`);
    
    if (!res.ok) {
        console.error(`[DEBUG] Fetch failed: ${res.statusText}`);
        return null; 
    }
    const json = await res.json();
    const data = json.data || json;
    // console.log(`[DEBUG] Restaurant data:`, data);
    
    return {
        ...data,
        logo: getImageUrl(data.profile_picture || data.logo),
        cover_image: getImageUrl(data.cover_photo)
    };
  } catch (error) {
    console.error("Failed to fetch restaurant", error);
    return null;
  }
};


interface ItemCategory {
    id: number;
    name: string;
    description?: string;
    image?: string;
}

export const getItemCategories = async (restaurantId: string): Promise<ItemCategory[]> => {
    try {
        const url = `${API_URL}/item-categories/restaurant/${restaurantId}`;
        console.log(`[API_DEBUG] 1. Fetching categories URL: ${url}`);
        
        const res = await fetch(url);
        console.log(`[API_DEBUG] 2. Categories Response Status: ${res.status}`);
        
        if (!res.ok) {
            console.error(`[API_DEBUG] Categories Failed: ${res.status} ${res.statusText}`);
            return [];
        }
        
        const json = await res.json();
        const data = json.data || json;
        console.log(`[API_DEBUG] 3. Categories Parsed Data Length: ${Array.isArray(data) ? data.length : 'Not Array'}`);
        if(Array.isArray(data) && data.length > 0) {
             console.log(`[API_DEBUG] Sample category: ID=${data[0].id} Name=${data[0].name}`);
        }
        return data;
    } catch (error) {
        console.error("Failed to fetch categories", error);
        return [];
    }
}

export const getGroupedMenu = async (restaurantId: string): Promise<MenuCategoryGroup[]> => {
  try {
    console.log(`[API] Fetching grouped menu for Restaurant ${restaurantId}`);
    
    // Use the grouped endpoint as it is the intended public API
    const res = await fetch(`${API_URL}/menus/restaurant/${restaurantId}/grouped`);
    
    if (!res.ok) {
        console.error(`[API] Grouped fetch failed: ${res.status}`);
        return [];
    }

    const json = await res.json();
    const rawData = json.data || json;
    
    if (!Array.isArray(rawData) || rawData.length === 0) {
        console.warn("[API] Grouped data is empty or not an array");
        return [];
    }

    console.log(`[API] Received ${rawData.length} groups. First item keys: ${Object.keys(rawData[0]).join(', ')}`);

    // Map the response to our internal structure
    return rawData.map((group: any) => {
        // Smart field mapping
        const name = group.name || group.category_name || group.title || "Uncategorized";
        const items = group.items || group.menu_items || group.dishes || [];
        const image = group.image || group.category_image;

        return {
            id: Number(group.id || group.category_id || Math.random()), 
            name: name,
            description: group.description,
            image: getImageUrl(image),
            items: Array.isArray(items) ? items.map((item: any) => ({
                ...item,
                id: Number(item.id),
                image: getImageUrl(item.image),
                price: Number(item.price || 0),
                category_type: item.category_type // Map this field
            })) : []
        };
    }).filter(g => g.items.length > 0); // Only show categories with items

  } catch (error) {
    console.error("Failed to fetch grouped menu", error);
    return [];
  }
};
