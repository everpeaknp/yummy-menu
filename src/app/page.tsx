import Link from "next/link";
import Image from "next/image";
import { Utensils } from "lucide-react";
import { getAllRestaurants } from "@/services/api";
import PaperPlaneButton from "@/components/PaperPlaneButton";
import RestaurantList from "@/components/RestaurantList";

export const revalidate = 60; // Revalidate list every minute

export default async function Home() {
  const restaurants = await getAllRestaurants();

  return (
    <main className="min-h-screen bg-gray-50 font-body text-slate-600">
      {/* Navigation / Header */}
      <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2">
                 {/* Logo from public/logos/yummy_logo.png */}
                 <div className="relative h-8 w-8 overflow-hidden rounded-md sm:h-10 sm:w-10">
                    <Image 
                        src="/logos/yummy_logo.png" 
                        alt="Yummy Logo" 
                        fill 
                        className="object-contain" 
                        unoptimized
                    />
                 </div>
                 <span className="text-2xl font-bold tracking-tight text-dark-900 font-display">Yummy Ever Menu</span>
            </div>
            
            <a 
                href="https://www.yummyever.com/" 
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-dark-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary-600 hover:shadow-lg hover:shadow-primary-500/20"
            >
                Website
            </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white pt-32 pb-16 sm:pt-44 sm:pb-24">
         <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <div className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-600 ring-1 ring-inset ring-primary-500/10 mb-8 uppercase tracking-wider">
                <Utensils size={14} className="mr-1.5 text-primary-500" /> Our Menu Directory 
            </div>
            
            <h1 className="mx-auto max-w-5xl text-5xl font-extrabold tracking-tight text-dark-900 sm:text-7xl lg:text-8xl font-display leading-[1.1]">
                All Your Favorite <br className="hidden sm:block" />
                Menus, <span className="text-primary-500">One Place.</span>
            </h1>
            
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-slate-600 font-light">
                Browse digital menus from top restaurants in Nepal. 
                <br />
                Find what you crave, check prices, and visit your favorite spots.
            </p>

            {/* CTA Button */}
            <div className="mt-12 flex items-center justify-center">
                 <PaperPlaneButton targetId="restaurant-grid" text="See All Restaurants" successText="Flying there..." />
            </div>
         </div>
      </section>

      {/* Restaurant Grid Section */}
      <section id="restaurant-grid" className="py-20 sm:py-32 bg-slate-50">
         <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-end justify-between mb-12 gap-4">
                <div>
                     <h2 className="text-3xl font-bold tracking-tight text-dark-900 sm:text-4xl font-display">Our Restaurants</h2>
                     <p className="mt-2 text-slate-500">Explore the best dining spots in town.</p>
                </div>
            </div>

            <RestaurantList initialRestaurants={restaurants} />
         </div>
      </section>
      
      {/* Footer Simple */}
      <footer className="bg-white border-t border-gray-100 py-12">
            <div className="mx-auto max-w-7xl px-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-slate-400 text-sm">&copy; 2026 Yummy Ever. All rights reserved.</p>
                <div className="flex gap-6 text-sm font-medium text-slate-500">
                    <a href="https://www.yummyever.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:text-primary-600 transition-colors">Privacy</a>
                    <a href="https://www.yummyever.com/terms-and-conditions" target="_blank" rel="noopener noreferrer" className="hover:text-primary-600 transition-colors">Terms</a>
                    <a href="https://www.yummyever.com/contact" target="_blank" rel="noopener noreferrer" className="hover:text-primary-600 transition-colors">Contact</a>
                </div>
            </div>
      </footer>
    </main>
  );
}
