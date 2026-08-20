import React, { Suspense } from "react";
import ProductGrid from "@/components/ProductGrid";
import SeriesCarousel from "@/components/SeriesCarousel";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  // Await the params object in Next.js 15+
  const resolvedParams = await params;
  const categorySlug = (resolvedParams.slug || "").toLowerCase();
  
  const supabase = await createClient();
  const { data: catData } = await supabase.from("categories").select("*").eq("slug", categorySlug).single();

  let categoryName = "";
  if (catData) {
    categoryName = catData.name;
  } else {
    // Fallback if not found in db
    categoryName = categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1);
    if (categorySlug === "dc") categoryName = "DC";
    if (categorySlug === "ww") categoryName = "WW";
  }

  const bgColor = catData?.bg_color || "bg-pink-300";
  const seriesList = catData?.series_list || [];

  return (
    <div className="pb-20 max-w-6xl mx-auto px-4 md:px-8 space-y-12">
      {/* Category Hero Banner */}
      <div className={`${bgColor} border-b-4 border-black p-8 md:p-16 shadow-[0px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden mt-8 flex flex-col items-center text-center animate-slide-in`}>
        <Link href="/">
          <button className="absolute top-4 left-4 md:top-6 md:left-6 px-4 py-2 bg-white font-black border-4 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform z-20">
            ← KEMBALI
          </button>
        </Link>
        <div className="relative z-10 pt-12 md:pt-4">
          <h2 className="text-xl md:text-2xl font-black uppercase mb-4 bg-white px-2 py-1 border-2 border-black inline-block transform -rotate-1">
            KATEGORI
          </h2>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none bg-black text-white inline-block px-6 py-3 border-4 border-white transform rotate-1 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            {categoryName}
          </h1>
        </div>
      </div>

      {/* Banner Carousel for Series Logos */}
      {seriesList.length > 0 && (
        <SeriesCarousel seriesList={seriesList} bgColor={bgColor} categorySlug={categorySlug} />
      )}

      <section id="etalase" className="pt-4">
        <Suspense fallback={<div className="py-20 text-center font-black text-2xl uppercase">Mensinkronisasi Data... ⚙️</div>}>
          <ProductGrid limit={20} initialCategory={categoryName} />
        </Suspense>
      </section>
    </div>
  );
}
