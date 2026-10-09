import axios from 'axios';

const getInitialBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const persisted = localStorage.getItem('yummy_api_url');
    if (persisted) return persisted;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001';
};

const INITIAL_API_URL = getInitialBaseUrl();
console.log(`[API] Initial Base URL: ${INITIAL_API_URL}`);

// Centralized Axios Instance
export const apiClient = axios.create({
  baseURL: INITIAL_API_URL,
  timeout: 15000,
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
    if (path.startsWith('/logos/') || path.startsWith('/images/')) return path;
    const apiOrigin = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001').replace(/\/$/, '');
    return new URL(path.startsWith('/') ? path : `/${path}`, apiOrigin).toString();
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
  billing_mode?: string;
  plan_state?: string;
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
    const response = await apiClient.get(`/restaurants/${id}`);
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

export const getAllRestaurants = async (strict = false): Promise<Restaurant[]> => {
    try {
        let response;
        try {
            response = await apiClient.get('/restaurants/directory');
        } catch (error: any) {
            // Existing test/production servers may not have the directory route yet.
            const routeMissing = error.response?.status === 404 ||
                (error.response?.status === 422 && error.response?.data?.errors?.some(
                    (item: any) => item.field === 'restaurant_id' && item.error?.includes('valid integer')
                ));
            if (!routeMissing) throw error;
            response = await apiClient.get('/restaurants/');
        }
        const data = response.data.data || response.data;
        if (!Array.isArray(data)) return [];
        
        return data
          .map((item: any) => ({
            ...item,
            logo: getImageUrl(item.profile_picture || item.logo),
            cover_image: getImageUrl(item.cover_photo)
          }))
          .filter((item: any) => {
            // Only show paid users, or users currently in an active trial
            if (item.billing_mode === 'paid') return true;
            if (item.billing_mode === 'trial' && item.plan_state === 'trialing') return true;
            
            // If they don't have these fields (legacy data), optionally include them
            // or return false if we want strict enforcement.
            // Strict enforcement as per user instructions:
            return false;
          });
    } catch (error) {
        console.error("Failed to fetch restaurants", error);
        if (strict) throw error;
        return [];
    }
}

export const getGroupedMenu = async (restaurantId: string): Promise<MenuCategoryGroup[]> => {
  try {
    console.log(`[API] Fetching grouped menu for Restaurant ${restaurantId}`);
    const response = await apiClient.get(`/menus/public/restaurant/${restaurantId}/grouped`, { headers: customerHeaders() });
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
    throw error;
  }
};

export const getModifierGroups = async (restaurantId: string): Promise<any[]> => {
  try {
    const response = await apiClient.get(`/public/modifiers/groups?restaurant_id=${restaurantId}`, { headers: customerHeaders() });
    return response.data.data.groups || [];
  } catch (error) {
    console.error("Failed to fetch modifier groups", error);
    throw error;
  }
};

export interface QRTableContext {
  restaurant_id: number;
  restaurant_name: string;
  table_id: number;
  table_name: string;
  token: string;
  local_pos_ip?: string | null;
  cloud_url?: string;
  ordered_items?: {
    id: number;
    menu_item_id: number;
    name: string;
    quantity: number;
    status: string;
    unit_price?: number;
    line_total?: number;
    notes?: string;
    image?: string;
  }[];
  active_orders?: {
    id: number;
    status: string;
    grand_total?: number;
    total?: number;
  }[];
}

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

    if (data.active_orders && Array.isArray(data.active_orders)) {
      data.active_orders = data.active_orders.map((order: any) => ({
        ...order,
        grand_total: Number(order.grand_total ?? order.total ?? 0)
      }));
    }
    
    return data;
  } catch (error) {
    console.error("Failed to verify QR token", error);
    throw error;
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
    }, { headers: customerHeaders() });
    return response.data;
  } catch (error: any) {
    console.error("Failed to request order", error);
    return { 
      error: "Request failed", 
      detail: error.response?.data?.detail || error.message,
      statusCode: error.response?.status
    };
  }
};

export interface CustomerRestaurantMembership {
  restaurant_id: number;
  restaurant_name: string;
  customer_id: number;
  loyalty_points: number;
  total_orders: number;
  total_spent: number;
  relationship_status: "subscriber" | "verified_customer";
}

export interface CustomerRestaurantInvitation {
  restaurant_id: number;
  restaurant_name: string;
  restaurant_phone?: string;
  customer_name: string;
  expired: boolean;
  expires_in_days: number;
}

export interface CustomerAccount {
  id: number;
  email?: string;
  email_verified: boolean;
  name: string;
  phone?: string;
  phone_verified: boolean;
  has_password: boolean;
  restaurants: CustomerRestaurantMembership[];
}

export interface CustomerOrder {
  id: number;
  restaurant_id: number;
  restaurant_name: string;
  status: string;
  grand_total: number;
  loyalty_points_redeemed: number;
  created_at: string;
  items: { name: string; quantity: number; line_total: number }[];
}

export interface CustomerReceivableSummary {
  restaurant_id: number;
  restaurant_name: string;
  amount_due: number;
  restaurant_credit: number;
  charges: { id: number; label: string; reference?: string; amount: number; open_amount: number; occurred_at: string; due_date?: string }[];
  credits: { id: number; label: string; reference?: string; amount: number; open_amount: number; occurred_at: string }[];
}

export interface CustomerEmailPreference {
  restaurant_id: number;
  available: boolean;
  opted_in: boolean;
  policy_version?: string;
  consent_text?: string;
}

export interface CustomerMarketingPreferences {
  restaurant_id: number;
  decision_required: boolean;
  email_decision_required: boolean;
  sms_decision_required: boolean;
  email_available: boolean;
  sms_available: boolean;
  email_opted_in: boolean;
  sms_opted_in: boolean;
  phone?: string;
  policy_version?: string;
  consent_text?: string;
}

export interface CustomerOffer {
  recipient_id: number;
  name: string;
  discount_type: "fixed" | "percentage";
  value: number;
  minimum_order_value: number;
  percentage_cap?: number;
  valid_until: string;
}

export interface TableServiceRequest {
  id: number;
  restaurant_id: number;
  table_id: number;
  table_name: string;
  request_type: string;
  note?: string;
  status: "pending" | "acknowledged" | "completed";
  created_at: string;
  acknowledged_at?: string;
}

const CUSTOMER_TOKEN_KEY = "yummy_customer_token";

export const getStoredCustomerToken = () => {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(CUSTOMER_TOKEN_KEY) || sessionStorage.getItem(CUSTOMER_TOKEN_KEY);
  if (token && !localStorage.getItem(CUSTOMER_TOKEN_KEY)) localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
  return token;
};

export const storeCustomerToken = (token: string, notify = true) => {
  localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
  sessionStorage.removeItem(CUSTOMER_TOKEN_KEY);
  if (notify) window.dispatchEvent(new Event('yummy_customer_session_updated'));
};

export const clearStoredCustomerToken = () => {
  localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  sessionStorage.removeItem(CUSTOMER_TOKEN_KEY);
  window.dispatchEvent(new Event('yummy_customer_session_updated'));
};

const customerHeaders = () => {
  const token = getStoredCustomerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const unwrap = <T,>(response: { data: { data?: T } | T }): T => {
  const body = response.data as { data?: T };
  return body.data === undefined ? response.data as T : body.data;
};

export const requestCustomerCode = async (identifier: string) => {
  await apiClient.post("/public/customer/auth/request-code", { identifier });
};

export const verifyCustomerCode = async (identifier: string, code: string, password?: string, name?: string) => {
  const response = await apiClient.post("/public/customer/auth/verify-code", { identifier, code, password: password || undefined, name: name || undefined }, { withCredentials: true });
  return unwrap<{ access_token: string }>(response).access_token;
};

export const loginCustomerWithPassword = async (identifier: string, password: string) => {
  const response = await apiClient.post("/public/customer/auth/password", { identifier, password }, { withCredentials: true });
  return unwrap<{ access_token: string }>(response).access_token;
};

export const setCustomerPassword = async (password: string, currentPassword?: string) => {
  await apiClient.post("/public/customer/me/password", { password, current_password: currentPassword || undefined }, { headers: customerHeaders() });
};

export const requestCustomerContactCode = async (identifier: string) => {
  await apiClient.post("/public/customer/me/contact/request-code", { identifier }, { headers: customerHeaders() });
};

export const verifyCustomerContactCode = async (identifier: string, code: string) => {
  const response = await apiClient.post("/public/customer/me/contact/verify-code", { identifier, code }, { headers: customerHeaders() });
  return unwrap<CustomerAccount>(response);
};

export const verifyCustomerGoogleToken = async (idToken: string) => {
  const response = await apiClient.post("/public/customer/auth/firebase/google", { id_token: idToken }, { withCredentials: true });
  return unwrap<{ access_token: string }>(response).access_token;
};

let customerRefreshPromise: Promise<string> | null = null;

export const refreshCustomerSession = async () => {
  const observedToken = getStoredCustomerToken();
  const refresh = async () => {
    const currentToken = getStoredCustomerToken();
    if (currentToken && observedToken && currentToken !== observedToken) return currentToken;
    const response = await apiClient.post("/public/customer/auth/refresh", {}, { withCredentials: true });
    const token = unwrap<{ access_token: string }>(response).access_token;
    storeCustomerToken(token, false);
    return token;
  };
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request("yummy-customer-session-refresh", refresh);
  }
  if (!customerRefreshPromise) customerRefreshPromise = refresh().finally(() => { customerRefreshPromise = null; });
  return customerRefreshPromise;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as (typeof error.config & { _customerRefreshAttempted?: boolean }) | undefined;
    const isCustomerRequest = Boolean(config?.headers?.Authorization);
    const isAuthRequest = typeof config?.url === "string" && config.url.startsWith("/public/customer/auth/");
    if (error.response?.status === 401 && isCustomerRequest && !isAuthRequest && config?._customerRefreshAttempted) clearStoredCustomerToken();
    if (error.response?.status !== 401 || !config || !isCustomerRequest || isAuthRequest || config._customerRefreshAttempted) {
      return Promise.reject(error);
    }
    config._customerRefreshAttempted = true;
    let token: string;
    try { token = await refreshCustomerSession(); }
    catch (refreshError: any) {
      if (refreshError.response?.status === 401) clearStoredCustomerToken();
      return Promise.reject(refreshError);
    }
    config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
    return apiClient(config);
  },
);

export const logoutCustomer = async () => {
  try {
    await apiClient.post("/public/customer/auth/logout", {}, { withCredentials: true });
  } finally {
    clearStoredCustomerToken();
  }
};

export const getCustomerAccount = async () => {
  const response = await apiClient.get("/public/customer/me", { headers: customerHeaders() });
  return unwrap<CustomerAccount>(response);
};

export const updateCustomerAccount = async (payload: { name: string; phone?: string }) => {
  const response = await apiClient.put("/public/customer/me", payload, { headers: customerHeaders() });
  return unwrap<CustomerAccount>(response);
};

export const requestCustomerEmailChange = async (email: string) => {
  await apiClient.post("/public/customer/me/email/request-code", { email }, { headers: customerHeaders() });
};

export const verifyCustomerEmailChange = async (email: string, code: string) => {
  const response = await apiClient.post("/public/customer/me/email/verify-code", { email, code }, { headers: customerHeaders() });
  return unwrap<CustomerAccount>(response);
};

export const joinCustomerRestaurant = async (restaurantId: number, name?: string) => {
  const response = await apiClient.post(
    `/public/customer/restaurants/${restaurantId}/join`,
    { name },
    { headers: customerHeaders() },
  );
  return unwrap<CustomerRestaurantMembership>(response);
};

export const getCustomerRestaurantInvitation = async (token: string) => {
  const response = await apiClient.get(`/public/customer/invitations/${encodeURIComponent(token)}`);
  return unwrap<CustomerRestaurantInvitation>(response);
};

export const acceptCustomerRestaurantInvitation = async (token: string) => {
  const response = await apiClient.post(
    `/public/customer/invitations/${encodeURIComponent(token)}/accept`,
    {},
    { headers: customerHeaders() },
  );
  return unwrap<CustomerRestaurantMembership>(response);
};

export const getCustomerOrders = async (restaurantId: number) => {
  const response = await apiClient.get("/public/customer/me/orders", {
    params: { restaurant_id: restaurantId },
    headers: customerHeaders(),
  });
  return unwrap<CustomerOrder[]>(response);
};

export const getCustomerReceivables = async (restaurantId: number) => {
  const response = await apiClient.get("/public/customer/me/receivables", {
    params: { restaurant_id: restaurantId },
    headers: customerHeaders(),
  });
  return unwrap<CustomerReceivableSummary>(response);
};

export const getCustomerEmailPreference = async (restaurantId: number) => {
  const response = await apiClient.get("/public/customer/me/email-preference", {
    params: { restaurant_id: restaurantId }, headers: customerHeaders(),
  });
  return unwrap<CustomerEmailPreference>(response);
};

export const getCustomerEmailOfferConfig = async (restaurantId: number) => {
  const response = await apiClient.get(`/public/customer/restaurants/${restaurantId}/email-offers`);
  return unwrap<CustomerEmailPreference>(response);
};

export const setCustomerEmailPreference = async (restaurantId: number, optedIn: boolean) => {
  const response = await apiClient.put(
    "/public/customer/me/email-preference", { opted_in: optedIn },
    { params: { restaurant_id: restaurantId }, headers: customerHeaders() },
  );
  return unwrap<CustomerEmailPreference>(response);
};

export const getCustomerMarketingPreferences = async (restaurantId: number) => {
  const response = await apiClient.get("/public/customer/me/marketing-preferences", {
    params: { restaurant_id: restaurantId }, headers: customerHeaders(),
  });
  return unwrap<CustomerMarketingPreferences>(response);
};

export const setCustomerMarketingPreferences = async (
  restaurantId: number,
  payload: { email_opted_in: boolean; sms_opted_in: boolean; phone?: string },
) => {
  const response = await apiClient.put(
    "/public/customer/me/marketing-preferences", payload,
    { params: { restaurant_id: restaurantId }, headers: customerHeaders() },
  );
  return unwrap<CustomerMarketingPreferences>(response);
};

export const getCustomerOffers = async (restaurantId: number) => {
  const response = await apiClient.get("/public/customer/me/offers", {
    params: { restaurant_id: restaurantId }, headers: customerHeaders(),
  });
  return unwrap<CustomerOffer[]>(response);
};

export const applyCustomerOffer = async (restaurantId: number, recipientId: number, orderId: number) => {
  const response = await apiClient.post(
    "/public/customer/me/offers/apply", { recipient_id: recipientId, order_id: orderId },
    { params: { restaurant_id: restaurantId }, headers: customerHeaders() },
  );
  return unwrap<{ valid: boolean; message: string; discount_amount: number; projected_grand_total: number }>(response);
};

export const createTableServiceRequest = async (qrToken: string, requestType: string) => {
  const response = await apiClient.post(
    "/public/table-service/requests", { qr_token: qrToken, request_type: requestType },
    { headers: customerHeaders() },
  );
  return unwrap<TableServiceRequest>(response);
};

export const getTableServiceRequests = async (qrToken: string) => {
  const response = await apiClient.get("/public/table-service/requests", { params: { qr_token: qrToken } });
  return unwrap<TableServiceRequest[]>(response);
};
