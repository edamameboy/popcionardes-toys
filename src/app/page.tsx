import React from "react";
import { createClient } from "@/utils/supabase/server";
import { Product } from "@/types";
import AddToCartButton from "@/components/AddToCartButton";

// Fungsi untuk format Rupiah
const formatRupiah = (angka: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
};

export default async function Home() {
  // Inisialisasi Supabase Server Client
  const supabase = await createClient();

  // Fetch data langsung dari database secara aman di sisi server!
  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal mengambil data produk:", error);
  }

  const productList: Product[] = products || [];

  return (
    <div className="p-6 md:p-12 space-y-16">
      {/* Hero Section (Tetap sama seperti sebelumnya) */}
      <section className="bg-blue-300 border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 md:p-16 flex flex-col items-center justify-center text-center space-y-8 relative overflow-hidden">
        {/* ... (kode hero section disembunyikan agar ringkas, gunakan yang dari tahap 1) ... */}
         <div className="absolute -top-10 -left-10 w-32 h-32 bg-yellow-400 rounded-full border-4 border-black z-0"></div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-pink-400 border-4 border-black -rotate-12 z-0"></div>
        <div className="z-10 space-y-6">
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tight leading-none text-black">
            Mainan Nyentrik <br /> Untuk Jiwa <span className="bg-yellow-400 px-3 py-1 border-4 border-black transform -rotate-3 inline-block shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Muda</span>
          </h1>
          <p className="text-xl md:text-2xl font-bold max-w-2xl mx-auto bg-white inline-block p-2 border-2 border-black">
            Koleksi mainan langka, aneh, dan penuh nostalgia. Jangan ditahan, checkout sekarang!
          </p>
        </div>
      </section>

      {/* Product Grid Section - REAL DATA */}
      <section className="space-y-8">
        <div className="flex items-end justify-between border-b-4 border-black pb-4">
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Produk Pilihan</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {productList.length === 0 ? (
            <div className="col-span-full p-8 border-4 border-black bg-white text-center font-bold">
              Produk lagi kosong, bos! Coba cek database Supabase.
            </div>
          ) : (
            productList.map((product) => (
              <div 
                key={product.id} 
                className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col group overflow-hidden"
              >
                {/* Product Image Placeholder memakai bgColor dari database */}
                <div className={`h-64 ${product.bg_color || 'bg-gray-300'} border-b-4 border-black flex items-center justify-center transition-transform duration-300 group-hover:scale-105 origin-bottom`}>
                  <span className="text-6xl font-black text-black opacity-30 tracking-tighter hover:opacity-100 transition-opacity">
                    TOY
                  </span>
                </div>
                
                {/* Product Info */}
                <div className="p-6 flex flex-col grow bg-white z-10 space-y-4">
                  <h3 className="text-2xl font-bold leading-tight uppercase">{product.name}</h3>
                  <p className="text-sm font-medium border-l-4 border-black pl-2">{product.description}</p>
                  
                  <div className="flex justify-between items-center mt-auto">
                    <p className="text-xl font-black bg-gray-100 px-2 py-1 border-2 border-black">
                      {formatRupiah(product.price)}
                    </p>
                    <p className="text-xs font-bold uppercase bg-black text-white px-2 py-1">
                      Stok: {product.stock}
                    </p>
                  </div>

                  {/* Integrasi tombol interaktif */}
                  <AddToCartButton product={product} />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}