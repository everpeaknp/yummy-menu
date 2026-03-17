import { redirect } from "next/navigation";
import { slugify } from "@/config/restaurants";
import { getRestaurant, verifyQrToken } from "@/services/api";

interface PageProps {
  params: {
    token: string;
  };
}

export const dynamic = "force-dynamic";

export default async function QrTokenEntryPage({ params }: PageProps) {
  const { token } = params;
  const qrContext = await verifyQrToken(token);

  if (!qrContext?.restaurant_id) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Invalid QR</h1>
          <p className="mt-2 text-gray-500">This QR token is invalid or expired.</p>
        </div>
      </div>
    );
  }

  const restaurant = await getRestaurant(String(qrContext.restaurant_id));
  if (!restaurant) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Restaurant Not Found</h1>
          <p className="mt-2 text-gray-500">
            Could not fetch details for restaurant ID {qrContext.restaurant_id}.
          </p>
        </div>
      </div>
    );
  }

  redirect(`/${qrContext.restaurant_id}/${slugify(restaurant.name)}`);
}
