import Link from "next/link";
import { ArrowRight, Utensils } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
      <div className="text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Utensils className="text-white" size={32} />
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-4">
          Yummy Menu
        </h1>
        
        <p className="text-lg text-gray-600 mb-8">
          A premium digital menu experience for modern restaurants.
        </p>

        <Link
          href="/yummy"
          className="inline-flex items-center gap-2 rounded-full bg-black px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-gray-800 transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <span>View Demo Menu</span>
          <ArrowRight size={18} />
        </Link>
        
        <p className="mt-8 text-sm text-gray-500">
            Navigate to <code>/[restaurant-name]</code> to view specific menus.
        </p>
      </div>
    </main>
  );
}
