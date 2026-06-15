"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useCartStore } from "@/store/cart";
import Link from "next/link";

const formatRupiah = (angka: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
};

export default function HomePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const addItem = useCartStore((state) => state.addItem);
  const supabase = createClient();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Tarik semua data produk dari database Supabase
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setProducts(data || []);
      } catch (error: any) {
        console.error("Gagal mengambil produk:", error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleAddToCart = (product: any) => {
    if (product.stock <= 0) {
      alert("Yah, barangnya udah habis bos!");
      return;
    }

    const cartItem = {
      ...product, 
      price: Number(product.price),
      quantity: 1,
    };

    addItem(cartItem);
    alert(`🔥 ${product.name} berhasil dilempar ke keranjang!`);
  };

  return (
    <div className="min-h-screen bg-[#fcf8f2] p-6 md:p-12 font-sans space-y-12">
      
      {/* === HERO SECTION === */}
      <header className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-8 bg-yellow-400 border-4 border-black p-8 md:p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex-1 space-y-6">
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none bg-white inline-block px-2 border-4 border-black transform -rotate-2">
            MAINAN ANEH
          </h1>
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none">
            UNTUK ORANG ANEH.
          </h2>
          <p className="font-bold text-lg max-w-md">
            Lupakan mainan pasaran. Di Popcionardes Toys, kami menjual barang-barang nyentrik yang bikin tetangga kamu bingung.
          </p>
        </div>
        <div className="w-full md:w-1/3 flex justify-center sm:flex">
          <img 
            src="https://api.dicebear.com/7.x/bottts/svg?seed=mascot" 
            alt="Mascot" 
            className="w-48 h-48 border-4 border-black bg-white rounded-full shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:rotate-12 transition-transform"
          />
        </div>
      </header>

      {/* === KATALOG PRODUK DINAMIS === */}
      <main className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-end border-b-4 border-black pb-4">
          <h2 className="text-4xl font-black uppercase tracking-tighter">
            Katalog Terbaru
          </h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64 text-2xl font-black uppercase animate-pulse">
            Membongkar Kardus Mainan... 📦
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white p-8 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center font-bold text-xl">
            Gudang masih kosong nih bos. Belum ada mainan yang dijual!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => (
              // Perhatikan betapa kerennya kita memanggil product.bg_color di class Tailwind ini!
              <div 
                key={product.id} 
                className={`border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col transition-all hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] ${product.bg_color || 'bg-white'}`}
              >
                <div className="bg-white border-4 border-black mb-4 overflow-hidden h-48 flex items-center justify-center">
                  <img 
                    src={product.image_url} 
                    alt={product.name} 
                    className="object-contain w-full h-full p-4 hover:scale-110 transition-transform" 
                  />
                </div>
                
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3 className="text-xl font-black uppercase leading-tight">
                    {product.name}
                  </h3>
                  <span className="text-xs font-black bg-white border-2 border-black px-2 py-1">
                    STOK: {product.stock}
                  </span>
                </div>
                
                <p className="text-sm font-bold opacity-80 mb-6 flex-1">
                  {product.description}
                </p>
                
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-xl font-black bg-white px-2 py-1 border-4 border-black transform rotate-2">
                    {formatRupiah(product.price)}
                  </span>
                  
                  <button 
                    onClick={() => handleAddToCart(product)}
                    disabled={product.stock <= 0}
                    className={`px-4 py-2 font-black uppercase border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all ${
                      product.stock > 0 
                      ? "bg-green-400 hover:shadow-none hover:translate-x-1 hover:translate-y-1" 
                      : "bg-gray-400 cursor-not-allowed text-white shadow-none translate-x-1 translate-y-1"
                    }`}
                  >
                    {product.stock > 0 ? "GAS BELI" : "HABIS"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

    </div>
  );
}