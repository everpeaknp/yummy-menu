import axios from 'axios';

const getInitialBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const persisted = localStorage.getItem('yummy_api_url');
    if (persisted) return persisted;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'https://yummy-321287803064.asia-south1.run.app';
};

const INITIAL_API_URL = getInitialBaseUrl();
console.log(`[API] Initial Base URL: ${INITIAL_API_URL}`);

// Centralized Axios Instance
export const apiClient = axios.create({
  baseURL: INITIAL_API_URL,
  timeout: 300000, // 5 minutes (increased for extremely slow backend/recovery)
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setBaseUrl = (url: string) => {
  console.log(`[API] Switching Base URL to: ${url}`);
  apiClient.defaults.baseURL = url;
  if (typeof window !== 'undefined') {
    localStorage.setItem('yummy_api_url', url);
  }
};

// Request interceptor for debug logging
apiClient.interceptors.request.use(config => {
  console.log(`[API_START] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

export const getImageUrl = (path?: string) => {
    if (!path) return undefined;
    if (path.startsWith('http')) return path;
    if (path.startsWith('asset:')) {
        const navPath = path.replace('asset:', '');
        const cleanPath = navPath.startsWith('/') ? navPath : `/${navPath}`;
        return cleanPath;
    }
    // Ensure relative paths start with a leading slash for next/image
    return path.startsWith('/') ? path : `/${path}`;
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
  dietary_info?: string[];
  category_type?: string;
  modifier_group_ids?: number[];
  category_name?: string;
}

export interface Restaurant {
  id: number;
  name: string;
  address?: string;
  logo?: string;
  cover_image?: string;
  phone?: string;
}

export interface QrVerifyResult {
  restaurant_id: number;
  restaurant_name?: string;
  table_id: number;
  table_name?: string;
  token: string;
  local_pos_ip?: string | null;
  cloud_url?: string;
  ordered_items?: {
    id: number;
    menu_item_id: number;
    name: string;
    quantity: number;
    status: string;
    image?: string;
  }[];
}

export const getRestaurant = async (id: string): Promise<Restaurant | null> => {
  try {
    const response = await apiClient.get(`/restaurants/${id}/`);
    const data = response.data.data || response.data;
    
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

export const getAllRestaurants = async (): Promise<Restaurant[]> => {
    try {
        const response = await apiClient.get('/restaurants/');
        const data = response.data.data || response.data;
        if (!Array.isArray(data)) return [];
        
        return data.map((item: any) => ({
            ...item,
            logo: getImageUrl(item.profile_picture || item.logo),
            cover_image: getImageUrl(item.cover_photo)
        }));
    } catch (error) {
        console.error("Failed to fetch restaurants", error);
        return [];
    }
}

export const getGroupedMenu = async (restaurantId: string): Promise<MenuCategoryGroup[]> => {
  try {
    console.log(`[API] Fetching grouped menu for Restaurant ${restaurantId}`);
    const response = await apiClient.get(`/menus/restaurant/${restaurantId}/grouped`);
    const rawData = response.data.data || response.data;
    
    if (!Array.isArray(rawData)) return [];

    return rawData.map((group: any) => ({
        id: Number(group.id || group.category_id || Math.random()), 
        name: group.name || group.category_name || "Uncategorized",
        description: group.description,
        image: getImageUrl(group.image || group.category_image),
        items: Array.isArray(group.items) ? group.items.map((item: any) => ({
            ...item,
            id: Number(item.id),
            image: getImageUrl(item.image),
            price: Number(item.price || 0),
            category_type: item.category_type,
            modifier_group_ids: item.modifier_group_ids || [],
            category_name: group.category_name || group.name || "Uncategorized"
        })) : []
    })).filter(g => g.items.length > 0);

  } catch (error) {
    console.error("Failed to fetch grouped menu", error);
    return [];
  }
};

export const getModifierGroups = async (restaurantId: string): Promise<any[]> => {
  try {
    const response = await apiClient.get(`/modifiers/groups?restaurant_id=${restaurantId}`);
    return response.data.data.groups || [];
  } catch (error) {
    console.error("Failed to fetch modifier groups", error);
    return [];
  }
};

/**
 * QR Table Context used by the verification page
 */
export interface QRTableContext extends QrVerifyResult {}

export const verifyQRToken = async (token: string): Promise<QRTableContext | null> => {
  try {
    const response = await apiClient.get(`/qr/verify/${token}`);
    const data = response.data;
    
    // Map image URLs for ordered items
    if (data.ordered_items && Array.isArray(data.ordered_items)) {
        data.ordered_items = data.ordered_items.map((item: any) => ({
            ...item,
            image: getImageUrl(item.image)
        }));
    }
    
    return data;
  } catch (error) {
    console.error("Failed to verify QR token", error);
    return null;
  }
};

// Add an alias for compatibility if needed, but the project seems to prefer verifyQRToken
export const verifyQrToken = verifyQRToken;

export const requestOrder = async (
  restaurantId: number,
  tableId: number,
  qrToken: string,
  items: { 
    menu_item_id: number; 
    qty: number; 
    notes?: string; 
    modifiers?: {
      modifier_id: number;
      modifier_name_snapshot: string;
      price_adjustment_snapshot: number;
    }[];
  }[]
) => {
  try {
    const response = await apiClient.post('/qr/orders/request', {
        restaurant_id: restaurantId,
        table_id: tableId,
        qr_token: qrToken,
        items
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to request order", error);
    return { 
      error: "Request failed", 
      detail: error.response?.data?.detail || error.message 
    };
  }
};
