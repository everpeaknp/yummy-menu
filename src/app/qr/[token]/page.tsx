"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { verifyQRToken } from "@/services/api";
import { slugify } from "@/config/restaurants";
import { Loader2 } from "lucide-react";

export default function QRVerifyPage() {
  const { token } = useParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    async function handleVerify() {
      try {
        const context = await verifyQRToken(token as string);
        
        if (!context) {
          setError("Invalid or expired QR code. Please ask the waiter for assistance.");
          return;
        }

        // --- SMART REDIRECT LOGIC ---
        // If local_pos_ip is provided, try to ping it
        if (context.local_pos_ip) {
          const localUrl = `http://${context.local_pos_ip}:8001`;
          console.log(`[QR] Local POS IP detected: ${context.local_pos_ip}. Attempting ping...`);
          
          try {
            // Light fetch with short timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s timeout
            
            const pingResponse = await fetch(`${localUrl}/qr/verify/${token}`, {
              method: 'GET', // or POST depending on backend, verify is GET usually
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (pingResponse.ok) {
              console.log("[QR] Local POS server reachable! Switching to local network.");
              // Import setBaseUrl dynamically or ensure it's available
              const { setBaseUrl } = await import("@/services/api");
              setBaseUrl(localUrl);
              // Also store local status in session
              localStorage.setItem("yummy_pos_mode", "local");
            }
          } catch (pingErr) {
            console.warn("[QR] Local POS server unreachable. Falling back to Cloud.", pingErr);
            localStorage.setItem("yummy_pos_mode", "cloud");
          }
        }

        // Store session info
        const sessionData = {
          restaurantId: context.restaurant_id,
          restaurantName: context.restaurant_name,
          tableId: context.table_id,
          tableName: context.table_name,
          qrToken: context.token,
          orderedItems: context.ordered_items,
          startTime: new Date().getTime()
        };
        
        localStorage.setItem("yummy_qr_session", JSON.stringify(sessionData));
        console.log("[QR] Session saved:", sessionData);

        // Redirect to menu with small delay to ensure storage flush
        setTimeout(() => {
          const restaurantSlug = slugify(context.restaurant_name);
          router.push(`/${context.restaurant_id}/${restaurantSlug}`);
        }, 100);
        
      } catch (err) {
        console.error("Verification error:", err);
        setError("Something went wrong. Please try again or scan the QR code again.");
      }
    }

    handleVerify();
  }, [token, router]);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <div className="mb-4 rounded-full bg-red-100 p-3 text-red-600">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Verification Failed</h1>
        <p className="mt-2 max-w-xs text-gray-500">{error}</p>
        
        <div className="mt-8 space-y-3 w-full max-w-xs">
          <button 
            onClick={() => window.location.reload()}
            className="w-full rounded-lg bg-black px-6 py-3 text-white shadow-md active:scale-95 font-bold"
          >
            Try Again
          </button>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2">Internal Testing Only</p>
            <button 
              onClick={async () => {
                // Manual debug bypass for testing
                const sessionData = {
                  restaurantId: 52,
                  restaurantName: "Yummyi",
                  tableId: 1, // Default to a valid ID
                  tableName: "DEBUG-TABLE",
                  qrToken: token as string || "manual-test",
                  startTime: new Date().getTime()
                };
                localStorage.setItem("yummy_qr_session", JSON.stringify(sessionData));
                const { slugify } = await import("@/config/restaurants");
                router.push(`/52/${slugify("Yummyi")}`);
              }}
              className="w-full rounded-lg border-2 border-dashed border-gray-300 px-6 py-2 text-gray-500 hover:bg-gray-100 active:scale-95 text-sm"
            >
              Skip Verification & Load Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-white">
      <div className="relative">
        <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-primary-600" />
        </div>
      </div>
      <h2 className="mt-6 text-lg font-medium text-gray-900">Verifying Table</h2>
      <p className="mt-2 text-sm text-gray-500">Preparing your digital menu...</p>
    </div>
  );
}
