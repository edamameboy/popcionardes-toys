"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useCartStore } from "@/store/cart";
import Link from "next/link";

import { formatRupiah } from "@/utils/formatters";

const CATEGORIES_DEFAULT = ["Semua", "Anime", "Marvel", "DC", "Disney", "Movies", "Gaming", "WW", "Music"];

// Accordion Item Component
const AccordionItem = ({ title, children, defaultOpen = true }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b-4 border-black">
      <button 
        className="w-full flex justify-between items-center p-3 font-black uppercase text-sm hover:bg-yellow-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{title}</span>
        <span className="text-xl leading-none">{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen && (
        <div className="p-3 bg-white border-t-4 border-black">
          {children}
        </div>
      )}
    </div>
  );
};

export default function ProductGrid({ limit = 20, initialCategory = "Semua", initialSeries = "", showFilters = true }: { limit?: number, initialCategory?: string, initialSeries?: string, showFilters?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const search = searchParams.get("search") || "";

  // Data & Pagination
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(limit);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Filter States
  const category = categoryParam || initialCategory;
  const [seriesFilter, setSeriesFilter] = useState(initialSeries);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [kondisi, setKondisi] = useState("Semua");
  const [penawaran, setPenawaran] = useState("Semua");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState("terbaru");

  const addItem = useCartStore((state) => state.addItem);
  const [categoriesData, setCategoriesData] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    supabase.from("categories").select("*").order("name").then(({ data }) => {
      if (data) setCategoriesData(data);
    });
  }, [supabase]);

  const CATEGORIES = categoriesData.length > 0 
    ? ["Semua", ...categoriesData.map(c => c.name)]
    : CATEGORIES_DEFAULT;

  useEffect(() => {
    // Set series if initialSeries changes (e.g. navigation)
    setSeriesFilter(initialSeries);
  }, [initialSeries]);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      
      let query = supabase.from("products").select("*");

      if (category !== "Semua") {
        query = query.eq("category", category);
      }
      if (search) {
        query = query.ilike("name", `%${search}%`);
      }
      if (showFilters && seriesFilter) {
        query = query.ilike("name", `%${seriesFilter}%`);
      }
      if (showFilters && inStockOnly) {
        query = query.gt("stock", 0);
      }
      if (showFilters && minPrice) {
        query = query.gte("price", Number(minPrice));
      }
      if (showFilters && maxPrice) {
        query = query.lte("price", Number(maxPrice));
      }

      if (showFilters) {
        if (sortBy === "price_asc") {
          query = query.order("price", { ascending: true });
        } else if (sortBy === "price_desc") {
          query = query.order("price", { ascending: false });
        } else if (sortBy === "stock_asc") {
          query = query.order("stock", { ascending: true });
        } else if (sortBy === "stock_desc") {
          query = query.order("stock", { ascending: false });
        } else if (sortBy === "oldest") {
          query = query.order("created_at", { ascending: true });
        } else {
          query = query.order("created_at", { ascending: false }); // newest
        }
      } else {
        query = query.order("created_at", { ascending: false }); // newest as default if no filters
      }

      // Ambil 100 max untuk di-slice di frontend
      const { data, error } = await query.limit(100);
      
      if (error) console.error(error);
      else setProducts(data || []);
      
      setIsLoading(false);
    };

    fetchProducts();
  }, [category, search, seriesFilter, minPrice, maxPrice, inStockOnly, sortBy, showFilters, supabase]);

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

  const handleCategoryChange = (cat: string) => {
    if (cat === "Semua") router.push("/");
    else router.push(`/kategori/${cat.toLowerCase()}`);
  };

  const displayedProducts = products.slice(0, visibleCount);
  const hasMore = visibleCount < products.length;

  const currentCategoryObj = categoriesData.find(c => c.name.toLowerCase() === category.toLowerCase() || c.slug.toLowerCase() === category.toLowerCase());
  const activeSeriesList: string[] = currentCategoryObj ? (currentCategoryObj.series_list || []) : [];

  return (
    <div className={`flex flex-col ${showFilters ? 'lg:flex-row' : ''} gap-6 lg:gap-8`}>
      {/* Mobile Sidebar Toggle */}
      {showFilters && (
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden w-full bg-yellow-300 border-4 border-black p-3 font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 transition-all"
        >
          {isSidebarOpen ? "Sembunyikan Filter ✖" : "Tampilkan Filter 🎛️"}
        </button>
      )}

      {/* Sidebar Filters */}
      {showFilters && (
        <div className={`${isSidebarOpen ? 'block' : 'hidden'} lg:block w-full lg:w-1/4 shrink-0`}>
          <div className="bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sticky top-24">
            <div className="bg-blue-300 border-b-4 border-black p-3 font-black uppercase text-lg">
              Filter
            </div>
            
            <AccordionItem title="Kategori" defaultOpen={true}>
              <div className="flex flex-col gap-2">
                {CATEGORIES.map(cat => (
                  <label key={cat} className="flex items-center gap-2 cursor-pointer group">
                    <input type="radio" name="category" checked={category === cat} onChange={() => handleCategoryChange(cat)} className="w-4 h-4 accent-black cursor-pointer" />
                    <span className={`text-sm font-bold group-hover:underline ${category === cat ? 'text-blue-600' : ''}`}>{cat}</span>
                  </label>
                ))}
              </div>
            </AccordionItem>

            {activeSeriesList.length > 0 && (
              <AccordionItem title="Series" defaultOpen={true}>
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="radio" name="series" checked={seriesFilter === ""} onChange={() => setSeriesFilter("")} className="w-4 h-4 accent-black cursor-pointer" />
                    <span className={`text-sm font-bold group-hover:underline ${seriesFilter === "" ? 'text-blue-600' : ''}`}>Semua Series</span>
                  </label>
                  {activeSeriesList.map(series => (
                    <label key={series} className="flex items-center gap-2 cursor-pointer group">
                      <input type="radio" name="series" checked={seriesFilter === series} onChange={() => setSeriesFilter(series)} className="w-4 h-4 accent-black cursor-pointer" />
                      <span className={`text-sm font-bold group-hover:underline ${seriesFilter === series ? 'text-blue-600' : ''}`}>{series}</span>
                    </label>
                  ))}
                </div>
              </AccordionItem>
            )}

            <AccordionItem title="Harga" defaultOpen={true}>
              <div className="flex flex-col gap-3">
                <input type="number" placeholder="Min (Rp)" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="w-full border-2 border-black p-2 text-sm font-bold outline-none focus:bg-yellow-100" />
                <input type="number" placeholder="Max (Rp)" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="w-full border-2 border-black p-2 text-sm font-bold outline-none focus:bg-yellow-100" />
              </div>
            </AccordionItem>

            <AccordionItem title="Kondisi" defaultOpen={false}>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="radio" name="kondisi" checked={kondisi === "Semua"} onChange={() => setKondisi("Semua")} className="w-4 h-4 accent-black cursor-pointer" />
                  <span className="text-sm font-bold">Semua Kondisi</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="radio" name="kondisi" checked={kondisi === "Baru"} onChange={() => setKondisi("Baru")} className="w-4 h-4 accent-black cursor-pointer" />
                  <span className="text-sm font-bold">Baru (New)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="radio" name="kondisi" checked={kondisi === "Bekas"} onChange={() => setKondisi("Bekas")} className="w-4 h-4 accent-black cursor-pointer" />
                  <span className="text-sm font-bold">Bekas (Pre-loved)</span>
                </label>
              </div>
            </AccordionItem>

            <AccordionItem title="Penawaran" defaultOpen={false}>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="radio" name="penawaran" checked={penawaran === "Semua"} onChange={() => setPenawaran("Semua")} className="w-4 h-4 accent-black cursor-pointer" />
                  <span className="text-sm font-bold">Semua Penawaran</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="radio" name="penawaran" checked={penawaran === "Diskon"} onChange={() => setPenawaran("Diskon")} className="w-4 h-4 accent-black cursor-pointer" />
                  <span className="text-sm font-bold">Sedang Diskon</span>
                </label>
              </div>
            </AccordionItem>

            <AccordionItem title="Lainnya" defaultOpen={true}>
               <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="w-4 h-4 accent-black cursor-pointer" />
                  <span className="text-sm font-bold">Hanya Ready Stock</span>
                </label>
              </div>
            </AccordionItem>
          </div>
        </div>
      )}

      {/* Main Grid Content */}
      <div className={`w-full ${showFilters ? 'lg:w-3/4' : ''} space-y-6`}>
        
        {/* Sort Controls (Header) */}
        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white border-4 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="font-black text-sm uppercase">Menampilkan {products.length} Produk</p>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="font-black uppercase text-xs whitespace-nowrap">Urutkan:</label>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="border-2 border-black p-1.5 font-bold text-xs bg-yellow-200 cursor-pointer outline-none hover:bg-yellow-300 w-full sm:w-auto"
              >
                <option value="newest">Terbaru Ditambahkan</option>
                <option value="oldest">Terlama Ditambahkan</option>
                <option value="price_asc">Harga: Termurah</option>
                <option value="price_desc">Harga: Termahal</option>
                <option value="stock_asc">Stok: Terdikit</option>
                <option value="stock_desc">Stok: Terbanyak</option>
              </select>
            </div>
          </div>
        )}

        {/* Product Grid */}
        {isLoading ? (
          <div className="py-20 text-center font-black text-2xl uppercase animate-pulse">Menggali Harta Karun... 🏴‍☠️</div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-4xl font-black uppercase mb-4">Yah, Kosong! 🕸️</p>
            <p className="font-bold text-lg">Karakter yang kamu cari belum mendarat di toko kami.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
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

                <div className="h-40 p-4 flex items-center justify-center border-b-4 border-black bg-white/40">
                  <Link href={`/produk/${product.id}`} className="block h-full w-full flex items-center justify-center">
                    <img 
                      src={product.image_url} 
                      alt={product.name} 
                      className="max-h-full max-w-full object-contain drop-shadow-xl mix-blend-darken hover:scale-110 transition-transform cursor-pointer"
                    />
                  </Link>
                </div>

                <div className="p-3 bg-white flex-1 flex flex-col justify-between">
                  <div>
                    <Link href={`/produk/${product.id}`}>
                      <h3 className="font-black uppercase text-sm leading-tight line-clamp-2 mb-2 hover:underline cursor-pointer" title={product.name}>
                        {product.name}
                      </h3>
                    </Link>
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
        )}
        
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
    </div>
  );
}
