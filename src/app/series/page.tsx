import React from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export default async function AllSeriesPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const resolvedParams = await searchParams;
  const categoryFilter = resolvedParams.category?.toLowerCase();

  const supabase = await createClient();
  let query = supabase.from("categories").select("*");
  if (categoryFilter) {
    query = query.eq("slug", categoryFilter);
  }
  const { data: categoriesData } = await query;

  // Flatten all series into a single array with their colors
  const allSeries: { name: string; color: string }[] = [];
  
  if (categoriesData) {
    categoriesData.forEach(cat => {
      const color = cat.bg_color || "bg-pink-300";
      if (cat.series_list && Array.isArray(cat.series_list)) {
        cat.series_list.forEach((series: string) => {
          allSeries.push({ name: series, color });
        });
      }
    });
  }

  return (
    <div className="pb-20 max-w-6xl mx-auto px-4 md:px-8 space-y-12">
      {/* Hero Banner */}
      <div className="bg-yellow-300 border-b-4 border-black p-8 md:p-16 shadow-[0px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden mt-8 flex flex-col items-center text-center animate-slide-in">
        <Link href="/">
          <button className="absolute top-4 left-4 md:top-6 md:left-6 px-4 py-2 bg-white font-black border-4 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform z-20">
            ← KEMBALI
          </button>
        </Link>
        <div className="relative z-10 pt-12 md:pt-4">
          <h2 className="text-xl md:text-2xl font-black uppercase mb-4 bg-white px-2 py-1 border-2 border-black inline-block transform -rotate-1">
            JELAJAHI SEMUA
          </h2>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none bg-black text-white inline-block px-6 py-3 border-4 border-white transform rotate-1 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            SERIES
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-4">
        {allSeries.map((series, idx) => (
          <Link href={`/series/${encodeURIComponent(series.name.toLowerCase())}`} key={idx} className="block group">
            <div className={`${series.color} border-4 border-black p-4 md:p-6 flex flex-col items-center justify-center text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] group-hover:-translate-y-2 transition-all cursor-pointer h-24 md:h-32`}>
              <span className="font-black uppercase tracking-tighter text-lg md:text-xl mix-blend-color-burn group-hover:scale-110 transition-transform">
                {series.name}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
