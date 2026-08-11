"use client";

import React, { useEffect, useState, Suspense } from "react";
import { createClient } from "@/utils/supabase/client";
import { useCartStore } from "@/store/cart";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const formatRupiah = (angka: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
};

// ==========================================
// DATA KATEGORI POPULER
// ==========================================
const CATEGORIES = [
  { name: "Anime", icon: "⚔️", color: "bg-orange-300" },
  { name: "Marvel", icon: "🦸‍♂️", color: "bg-red-400" },
  { name: "DC", icon: "🦇", color: "bg-slate-400" },
  { name: "Disney", icon: "🏰", color: "bg-blue-300" },
  { name: "Movies", icon: "🍿", color: "bg-yellow-300" },
  { name: "Gaming", icon: "🎮", color: "bg-green-400" },
  { name: "WW", icon: "🪄", color: "bg-purple-300" },
  { name: "Music", icon: "🎸", color: "bg-pink-300" },
];

// ==========================================
// KOMPONEN GRID PRODUK
// ==========================================
function ProductGrid({ limit = 20 }: { limit?: number }) {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") || "Semua";
  const search = searchParams.get("search") || "";

  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(limit);
  
  const addItem = useCartStore((state) => state.addItem);
  const supabase = createClient();

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      
      let query = supabase.from("products").select("*").order("created_at", { ascending: false });

      if (category !== "Semua") {
        query = query.eq("category", category);
      }
      if (search) {
        query = query.ilike("name", `%${search}%`);
      }

      // Ambil 100 max untuk di-slice di frontend
      const { data, error } = await query.limit(100);
      
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

  const displayedProducts = products.slice(0, visibleCount);
  const hasMore = visibleCount < products.length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {displayedProducts.map((product) => (
          <div key={product.id} className={`flex flex-col border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 relative ${product.bg_color || 'bg-white'}`}>
            
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

            <div className="h-48 p-4 flex items-center justify-center border-b-4 border-black bg-white/40">
              <img 
                src={product.image_url} 
                alt={product.name} 
                className="max-h-full max-w-full object-contain drop-shadow-xl mix-blend-darken hover:scale-110 transition-transform cursor-pointer"
              />
            </div>

            <div className="p-3 bg-white flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-black uppercase text-sm leading-tight line-clamp-2 mb-2" title={product.name}>
                  {product.name}
                </h3>
                <span className="font-black text-sm md:text-base bg-yellow-200 px-1 border-2 border-black block w-max mb-3 transform -rotate-2">
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
      
      {hasMore && (
        <div className="text-center pt-4">
          <button 
            onClick={() => setVisibleCount(prev => prev + 20)}
            className="px-8 py-3 bg-blue-300 border-4 border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
          >
            Muat Lebih Banyak 👇
          </button>
        </div>
      )}
    </div>
  );
}

// ==========================================
// NEW ARRIVALS CAROUSEL
// ==========================================
function NewArrivals() {
  const [products, setProducts] = useState<any[]>([]);
  const supabase = createClient();
  const addItem = useCartStore((state) => state.addItem);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchNew = async () => {
      const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false }).limit(8);
      if (data) setProducts(data);
    };
    fetchNew();
  }, [supabase]);

  if (!products.length) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth / 2 : scrollLeft + clientWidth / 2;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative group">
      {/* Scroll Left Button */}
      <button 
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 w-12 h-12 bg-yellow-300 border-4 border-black font-black flex items-center justify-center text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-400 hover:-translate-y-[calc(50%+4px)] transition-all opacity-0 group-hover:opacity-100 hidden md:flex"
      >
        ←
      </button>

      <div ref={scrollRef} className="flex overflow-x-auto gap-4 md:gap-6 pb-6 pt-2 px-2 no-scrollbar snap-x snap-mandatory">
        {products.map((product) => (
          <div key={product.id} className="snap-start shrink-0 w-48 md:w-56 flex flex-col border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-white">
            <div className="h-40 p-4 border-b-4 border-black bg-white/40 flex items-center justify-center relative">
              <span className="absolute top-2 left-2 text-[10px] font-black uppercase bg-pink-400 text-white border-2 border-black px-1.5 py-0.5 transform -rotate-3 z-10">
                BARU!
              </span>
              <img src={product.image_url} alt={product.name} className="max-h-full max-w-full object-contain mix-blend-darken hover:scale-110 transition-transform cursor-pointer drop-shadow-md" />
            </div>
            <div className="p-3 flex flex-col justify-between flex-1">
              <h3 className="font-black uppercase text-xs leading-tight line-clamp-2 mb-2">{product.name}</h3>
              <div className="flex justify-between items-center mt-auto">
                <span className="font-black text-sm bg-yellow-200 px-1 border-2 border-black">{formatRupiah(product.price)}</span>
                <button 
                  onClick={() => {
                    if(product.stock > 0) {
                      addItem({...product, quantity: 1} as any);
                      alert(`🛒 ${product.name} masuk keranjang!`);
                    }
                  }}
                  className={`w-8 h-8 flex items-center justify-center border-2 border-black font-black ${product.stock > 0 ? 'bg-green-400 hover:bg-green-500' : 'bg-gray-300 opacity-50'}`}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Scroll Right Button */}
      <button 
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20 w-12 h-12 bg-yellow-300 border-4 border-black font-black flex items-center justify-center text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-400 hover:-translate-y-[calc(50%+4px)] transition-all opacity-0 group-hover:opacity-100 hidden md:flex"
      >
        →
      </button>
    </div>
  );
}

// ==========================================
// KOMPONEN UTAMA (HALAMAN BERANDA)
// ==========================================
export default function HomePage() {
  return (
    <div className="pb-20">
      
      {/* 1. HERO BANNER */}
      <div className="bg-pink-300 border-b-4 border-black p-6 md:p-12 shadow-[0px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden min-h-[70vh] flex items-center mb-8">
        <div className="max-w-6xl mx-auto w-full flex flex-col md:flex-row items-center relative z-20">
          <div className="md:w-1/2 space-y-6 animate-slide-in">
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none bg-white inline-block px-4 py-2 border-4 border-black transform -rotate-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                MARKAS BESAR
              </h1>
              <br />
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none bg-yellow-300 inline-block px-4 py-2 border-4 border-black transform rotate-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                FUNKO POP! 🧸
              </h1>
            </div>
            
            <p className="font-bold text-base md:text-lg max-w-lg bg-white p-4 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] leading-relaxed">
              Temukan ribuan koleksi karakter favoritmu dari berbagai universe. Siapkan ruang di rakmu, karena racun belanja dimulai di sini!
            </p>
            
            <div className="flex gap-4 pt-4">
              <a href="#etalase" className="px-6 py-3 md:px-8 md:py-4 bg-green-400 border-4 border-black font-black uppercase text-lg md:text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
                Mulai Belanja 🛒
              </a>
            </div>
          </div>
          
          <div className="md:w-1/2 mt-12 md:mt-0 relative flex justify-center items-center">
            <div className="absolute w-[250px] h-[250px] md:w-[450px] md:h-[450px] bg-blue-400 border-8 border-black rounded-full mix-blend-multiply animate-pulse"></div>
            <img 
              src="/funko-hero.png" 
              alt="Funko Pop Hero" 
              className="relative z-10 w-56 md:w-96 h-auto object-contain transform -rotate-3 drop-shadow-[12px_12px_0px_rgba(0,0,0,0.8)] hover:scale-105 transition-transform duration-300"
            />
            
            {/* Promo Badge Floating */}
            <div className="absolute -top-4 right-0 md:top-10 md:right-10 z-20 bg-yellow-400 border-4 border-black p-3 md:p-4 rounded-full w-24 h-24 md:w-32 md:h-32 flex items-center justify-center text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform rotate-12 animate-bounce">
              <span className="font-black uppercase text-[10px] md:text-sm leading-tight">
                Gratis Ongkir<br/>&gt;500RB!
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PROMO TICKER BAR (Dipindah ke layout) */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-16 md:space-y-20 pt-8">
        
        {/* 3. KATEGORI POPULER */}
        <section>
          <div className="flex items-center gap-4 mb-6 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-black uppercase bg-yellow-300 px-4 py-2 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform -rotate-1">
              Shop by Universe 🌌
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
            {CATEGORIES.map((cat) => (
              <Link href={`/?category=${cat.name}#etalase`} key={cat.name} className="block group">
                <div className={`${cat.color} border-4 border-black p-4 md:p-6 flex flex-col items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] group-hover:-translate-y-2 transition-all cursor-pointer h-24 md:h-32`}>
                  <span className="text-3xl md:text-4xl group-hover:scale-125 transition-transform">{cat.icon}</span>
                  <span className="font-black uppercase tracking-wider text-xs md:text-base">{cat.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 4. NEW ARRIVALS */}
        <section className="bg-white border-4 border-black p-4 pt-10 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative mt-8">
          <div className="absolute -top-6 left-2 md:-left-2 transform -rotate-3 z-10">
            <span className="bg-pink-300 px-3 py-1.5 md:px-4 md:py-2 border-4 border-black text-lg md:text-xl font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              NEW ARRIVALS ⚡
            </span>
          </div>
          <div className="pt-2 md:pt-6">
            <NewArrivals />
          </div>
        </section>

        {/* 7. USP (KENAPA BELANJA DI SINI) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center space-y-2 hover:-translate-y-2 transition-transform">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="font-black uppercase text-lg">100% Original</h3>
            <p className="text-sm font-bold opacity-70">Resmi & bersertifikat dari Funko Inc.</p>
          </div>
          <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center space-y-2 hover:-translate-y-2 transition-transform">
            <div className="text-5xl mb-4">🚚</div>
            <h3 className="font-black uppercase text-lg">Gratis Ongkir</h3>
            <p className="text-sm font-bold opacity-70">Min. belanja 500rb ke seluruh Indonesia.</p>
          </div>
          <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center space-y-2 hover:-translate-y-2 transition-transform">
            <div className="text-5xl mb-4">🪙</div>
            <h3 className="font-black uppercase text-lg">Loyalty Points</h3>
            <p className="text-sm font-bold opacity-70">Kumpulkan poin & tukar dengan diskon.</p>
          </div>
          <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center space-y-2 hover:-translate-y-2 transition-transform">
            <div className="text-5xl mb-4">📦</div>
            <h3 className="font-black uppercase text-lg">Packing Aman</h3>
            <p className="text-sm font-bold opacity-70">Double bubble wrap + kardus tebal.</p>
          </div>
        </section>

        {/* 5. ETALASE PRODUK GRID */}
        <section id="etalase">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <h2 className="text-2xl md:text-3xl font-black uppercase bg-blue-300 px-4 py-2 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform rotate-1 self-start">
              🔥 Etalase Mainan
            </h2>
            <div className="bg-white border-2 border-black px-4 py-2 font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              Gunakan kotak pencarian di atas untuk filter spesifik! 👆
            </div>
          </div>
          
          <Suspense fallback={<div className="py-20 text-center font-black text-2xl uppercase">Mensinkronisasi Data... ⚙️</div>}>
            <ProductGrid limit={20} />
          </Suspense>
        </section>

        {/* 6. TESTIMONI KOLEKTOR */}
        <section className="bg-yellow-100 border-4 border-black p-8 md:p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-2xl md:text-3xl font-black uppercase text-center mb-8 md:mb-10">
            KATA PARA KOLEKTOR 💬
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative">
              <div className="absolute -top-6 left-6 text-4xl">⭐⭐⭐⭐⭐</div>
              <p className="font-bold mt-4 italic">"Packingnya gila sih, aman banget! Box Funko gw mulus tanpa penyok sedikitpun. Mantap!"</p>
              <div className="mt-4 flex items-center gap-3 border-t-2 border-black pt-4">
                <div className="w-10 h-10 bg-blue-300 border-2 border-black rounded-full"></div>
                <div>
                  <p className="font-black uppercase text-sm">Budi P.</p>
                  <p className="text-xs font-bold opacity-70">Kolektor Marvel</p>
                </div>
              </div>
            </div>
            <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative transform md:-translate-y-4">
              <div className="absolute -top-6 left-6 text-4xl">⭐⭐⭐⭐⭐</div>
              <p className="font-bold mt-4 italic">"Suka banget sama sistem poinnya. Udah 2 kali tukar voucher diskon 50rb. Lumayan buat tambah koleksi!"</p>
              <div className="mt-4 flex items-center gap-3 border-t-2 border-black pt-4">
                <div className="w-10 h-10 bg-pink-300 border-2 border-black rounded-full"></div>
                <div>
                  <p className="font-black uppercase text-sm">Siska W.</p>
                  <p className="text-xs font-bold opacity-70">Pecinta Anime</p>
                </div>
              </div>
            </div>
            <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative">
              <div className="absolute -top-6 left-6 text-4xl">⭐⭐⭐⭐⭐</div>
              <p className="font-bold mt-4 italic">"Pengiriman cepet banget, adminnya juga ramah. Koleksi Star Wars gw makin lengkap berkat Popcionardes."</p>
              <div className="mt-4 flex items-center gap-3 border-t-2 border-black pt-4">
                <div className="w-10 h-10 bg-green-300 border-2 border-black rounded-full"></div>
                <div>
                  <p className="font-black uppercase text-sm">Rian M.</p>
                  <p className="text-xs font-bold opacity-70">Star Wars Geek</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 8. MEMBERSHIP CTA */}
        <section className="bg-pink-300 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row overflow-hidden relative">
          <div className="p-8 md:p-12 md:w-2/3 flex flex-col justify-center space-y-4 z-20">
            <h2 className="text-2xl md:text-4xl font-black uppercase text-black">
              BELUM PUNYA AKUN? 😲
            </h2>
            <p className="font-bold text-base md:text-lg max-w-md bg-white p-3 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              Daftar sekarang dan langsung dapatkan 50 POIN gratis yang bisa ditukar dengan voucher diskon!
            </p>
            <div className="pt-4">
              <Link href="/register">
                <button className="w-full md:w-auto px-8 py-4 bg-black text-white font-black uppercase border-4 border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:bg-yellow-400 hover:text-black hover:border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1">
                  Daftar Sekarang 🚀
                </button>
              </Link>
            </div>
          </div>
          <div className="md:w-1/3 bg-blue-400 border-t-4 md:border-t-0 md:border-l-4 border-black p-8 flex items-center justify-center relative min-h-[250px] z-10">
             <img src="/funko-hero.png" alt="Join Us" className="w-48 h-auto object-contain transform rotate-6 drop-shadow-[8px_8px_0px_rgba(0,0,0,0.5)] absolute -bottom-10 right-10 md:right-auto" />
          </div>
        </section>

      </div>
    </div>
  );
}