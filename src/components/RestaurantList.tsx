"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Phone, Search, Utensils } from "lucide-react";
import { Restaurant } from "@/services/api";
import { slugify } from "@/config/restaurants";

interface RestaurantListProps {
  initialRestaurants: Restaurant[];
}

const ITEMS_PER_PAGE = 12;

export default function RestaurantList({ initialRestaurants }: RestaurantListProps) {
  const [displayedRestaurants, setDisplayedRestaurants] = useState<Restaurant[]>([]);
  const [page, setPage] = useState(1);
  const loadingRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    setDisplayedRestaurants(initialRestaurants.slice(0, ITEMS_PER_PAGE));
  }, [initialRestaurants]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
             loadMore();
        }
      },
      { threshold: 0.5 } // Trigger when 50% of loader is visible
    );

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    return () => {
      if (loadingRef.current) {
        observer.unobserve(loadingRef.current);
      }
    };
  }, [displayedRestaurants, initialRestaurants]);

  const loadMore = () => {
      const nextCount = (page + 1) * ITEMS_PER_PAGE;
      if (displayedRestaurants.length < initialRestaurants.length) {
          // Add a small delay for "loading" feel or just immediate
          setDisplayedRestaurants(initialRestaurants.slice(0, nextCount));
          setPage(prev => prev + 1);
      }
  };
  
  const hasMore = displayedRestaurants.length < initialRestaurants.length;

  if (initialRestaurants.length === 0) {
      return (
        <div className="text-center py-24">
             <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
                <Search className="h-6 w-6 text-gray-400" />
             </div>
            <h3 className="text-lg font-medium text-gray-900">No restaurants found</h3>
            <p className="mt-1 text-gray-500">We couldn&apos;t find any restaurants at the moment.</p>
        </div>
      );
  }

  return (
    <>
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
            {displayedRestaurants.map((restaurant) => {
                const slug = slugify(restaurant.name);
                const href = `/${restaurant.id}/${slug}`;
                
                return (
                    <Link key={restaurant.id} href={href} className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary-500/10">
                        {/* Cover Image */}
                        <div className="relative h-52 w-full overflow-hidden bg-gray-100">
                            {restaurant.cover_image ? (
                                <Image
                                    src={restaurant.cover_image}
                                    alt={restaurant.name}
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-slate-100/50 text-slate-300">
                                    <Utensils size={40} />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-dark-900/80 via-transparent to-transparent opacity-80" />
                            
                            {/* Logo (Floating inside cover) */}
                            <div className="absolute bottom-4 left-4 flex gap-3 items-center">
                                <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-white shadow-lg z-10">
                                     {restaurant.logo ? (
                                        <Image
                                            src={restaurant.logo}
                                            alt="Logo"
                                            width={48}
                                            height={48}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="h-full w-full bg-primary-50 flex items-center justify-center text-primary-500 font-bold text-lg font-display">
                                            {restaurant.name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <h3 className="text-lg font-bold text-white font-display drop-shadow-md line-clamp-1">
                                    {restaurant.name}
                                </h3>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex flex-1 flex-col p-5">
                            <div className="flex flex-col gap-2.5 text-sm text-slate-500 min-h-[4rem]">
                                {restaurant.address ? (
                                    <div className="flex items-start gap-2.5">
                                        <MapPin size={16} className="text-primary-500 shrink-0 mt-0.5" />
                                        <span className="line-clamp-2 leading-relaxed font-medium text-slate-600">{restaurant.address}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2.5 opacity-50">
                                        <MapPin size={16} />
                                        <span>Address not available</span>
                                    </div>
                                )}
                                
                                 {restaurant.phone && (
                                    <div className="flex items-center gap-2.5">
                                        <Phone size={16} className="text-primary-500 shrink-0" />
                                        <span className="font-medium text-slate-600">{restaurant.phone}</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex items-center justify-between border-t border-gray-50 pt-4">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">View Menu</span>
                                <div className="h-8 w-8 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 group-hover:bg-primary-500 group-hover:text-white transition-colors">
                                    <ArrowRight size={14} strokeWidth={2.5} />
                                </div>
                            </div>
                        </div>
                    </Link>
                )
            })}
        </div>
        
        {/* Loading Indicator / Trigger */}
        {hasMore && (
             <div ref={loadingRef} className="mt-12 flex justify-center py-4">
                 <div className="flex items-center gap-2 text-primary-600 font-medium animate-pulse">
                     <span className="h-2 w-2 rounded-full bg-primary-500 animate-bounce [animation-delay:-0.3s]"></span>
                     <span className="h-2 w-2 rounded-full bg-primary-500 animate-bounce [animation-delay:-0.15s]"></span>
                     <span className="h-2 w-2 rounded-full bg-primary-500 animate-bounce"></span>
                 </div>
             </div>
        )}
    </>
  );
}
