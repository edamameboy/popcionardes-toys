"use client";

import React, { useEffect, useState, Suspense } from "react";
import { createClient } from "@/utils/supabase/client";
import { useCartStore } from "@/store/cart";
import { useSearchParams } from "next/navigation";

const formatRupiah = (angka: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
};

// ==========================================
// KOMPONEN GRID PRODUK (Terpisah agar aman dari Next.js Hydration)
// ==========================================
function ProductGrid() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") || "Semua";
  const search = searchParams.get("search") || "";

  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Zustand: Fungsi untuk memasukkan barang ke keranjang
  const addItem = useCartStore((state) => state.addItem);
  const supabase = createClient();

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      
      // Susun Query ke Database
      let query = supabase.from("products").select("*").order("created_at", { ascending: false });

      if (category !== "Semua") {
        query = query.eq("category", category);
      }
      if (search) {
        query = query.ilike("name", `%${search}%`);
      }

      // Batasi 40 produk teratas agar browser tidak meledak meload 8000 gambar sekaligus
      const { data, error } = await query.limit(40);
      
      if (error) console.error(error);
      else setProducts(data || []);
      
      setIsLoading(false);
    };

    fetchProducts();
  }, [category, search, supabase]);

  const handleAddToCart = (product: any) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1, 
      stock: product.stock,
      image_url: product.image_url
    }as any);
    
    // Tampilkan notifikasi native sebentar
    alert(`🛒 ${product.name} berhasil masuk keranjang!`);
  };

  if (isLoading) {
    return <div className="py-20 text-center font-black text-2xl uppercase animate-pulse">Menggali Harta Karun... 🏴‍☠️</div>;
  }

  if (products.length === 0) {
    return (
      <div className="py-20 text-center border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-4xl font-black uppercase mb-4">Yah, Kosong! 🕸️</p>
        <p className="font-bold text-lg">Karakter yang kamu cari belum mendarat di toko kami.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
      {products.map((product) => (
        <div key={product.id} className={`flex flex-col border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 relative ${product.bg_color || 'bg-white'}`}>
          
          {/* BADGE KATEGORI & ALERT STOK MENIPIS */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            <span className="text-[10px] font-black uppercase bg-white border-2 border-black px-1.5 py-0.5 w-max">
              {product.category}
            </span>
            {product.stock <= 5 && product.stock > 0 && (
              <span className="text-[10px] font-black uppercase bg-red-400 text-white border-2 border-black px-1.5 py-0.5 w-max animate-bounce shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                Sisa {product.stock}!
              </span>
            )}
            {product.stock === 0 && (
              <span className="text-[10px] font-black uppercase bg-gray-500 text-white border-2 border-black px-1.5 py-0.5 w-max">
                HABIS (SOLD)
              </span>
            )}
          </div>

          {/* GAMBAR PRODUK (Dengan Trik Mix-Blend Transparan) */}
          <div className="h-48 p-4 flex items-center justify-center border-b-4 border-black bg-white/40">
            <img 
              src={product.image_url} 
              alt={product.name} 
              className="max-h-full max-w-full object-contain drop-shadow-xl mix-blend-darken hover:scale-110 transition-transform cursor-pointer"
            />
          </div>

          {/* INFO PRODUK & TOMBOL BELI */}
          <div className="p-3 bg-white flex-1 flex flex-col justify-between">
            <div>
              <h3 className="font-black uppercase text-sm leading-tight line-clamp-2 mb-2" title={product.name}>
                {product.name}
              </h3>
              <span className="font-black text-lg bg-yellow-200 px-1 border-2 border-black block w-max mb-3 transform -rotate-2">
                {formatRupiah(product.price)}
              </span>
            </div>
            
            <button 
              onClick={() => handleAddToCart(product)}
              disabled={product.stock === 0}
              className={`w-full py-2 font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all text-xs sm:text-sm
                ${product.stock === 0 ? 'bg-gray-300 cursor-not-allowed opacity-50' : 'bg-green-400 hover:bg-green-500 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'}
              `}
            >
              {product.stock === 0 ? "SOLD OUT ❌" : "Sikat! 🛒"}
            </button>
          </div>

        </div>
      ))}
    </div>
  );
}

// ==========================================
// KOMPONEN UTAMA (HALAMAN BERANDA)
// ==========================================
export default function HomePage() {
  return (
    <div className="p-4 md:p-8 max-w-350 mx-auto space-y-10">
      
      {/* HERO BANNER NEO BRUTALISM */}
      <div className="bg-pink-300 border-4 border-black p-6 md:p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden min-h-87.5 flex items-center">
        
        {/* KIRI: Teks Banner (Sama persis tidak ada yang diubah) */}
        <div className="relative z-20 md:w-2/3 space-y-4">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none bg-white inline-block px-2 border-4 border-black transform -rotate-1">
            MARKAS BESAR
          </h1>
          <br />
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none bg-yellow-300 inline-block px-2 border-4 border-black transform rotate-1 mt-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            FUNKO POP! 🧸
          </h1>
          <p className="font-bold text-lg max-w-xl mt-4 bg-white p-2 border-2 border-black inline-block shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            Temukan ribuan koleksi karakter favoritmu dari berbagai universe. Siapkan ruang di rakmu, karena racun belanja dimulai di sini!
          </p>
        </div>
        
        {/* KANAN: Ornamen Lingkaran & Maskot Gambar Funko POP! */}
        <div className="absolute right-5 bottom-5 md:right-10 md:-bottom-6 opacity-40 md:opacity-100 pointer-events-none flex items-end justify-center z-10">
          
          {/* Lingkaran Biru (Dibuat center tepat di belakang gambar) */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 md:w-87.5 md:h-87.5 bg-blue-400 border-8 border-black rounded-full mix-blend-multiply"></div>
          
          <img 
            src="/funko-hero.png" 
            alt="Funko Pop Hero" 
            className="relative z-10 w-48 md:w-80 h-auto object-contain transform -rotate-3 drop-shadow-[8px_8px_0px_rgba(0,0,0,0.8)] transition-transform"
          />
        </div>

      </div>

      {/* FILTER PENCARIAN & GRID PRODUK */}
      <div>
        <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-2">
          <span className="bg-blue-300 px-2 py-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transform -rotate-1">
            🔥 Etalase Mainan
          </span>
        </h2>
        
        {/* Wajib menggunakan Suspense saat membaca URL params di Next.js 13+ */}
        <Suspense fallback={<div className="py-20 text-center font-black text-2xl uppercase">Mensinkronisasi Data... ⚙️</div>}>
          <ProductGrid />
        </Suspense>
      </div>
      
    </div>
  );
}