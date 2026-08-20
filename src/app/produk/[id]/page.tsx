"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useCartStore } from "@/store/cart";
import Link from "next/link";

import { formatRupiah } from "@/utils/formatters";

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();
  const addItem = useCartStore((state) => state.addItem);

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mainImage, setMainImage] = useState("");

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
      if (data) {
        setProduct(data);
        setMainImage(data.image_url);
      }
      setLoading(false);
    };
    fetchProduct();
  }, [id, supabase]);

  if (loading) {
    return (
      <div className="py-32 text-center">
        <h2 className="text-3xl font-black uppercase animate-pulse">Loading Product... ⚙️</h2>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="py-32 text-center">
        <h2 className="text-3xl font-black uppercase mb-4">Produk Tidak Ditemukan 😢</h2>
        <Link href="/">
          <button className="px-6 py-3 bg-yellow-300 font-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform">
            KEMBALI KE BERANDA
          </button>
        </Link>
      </div>
    );
  }

  // Gabungkan gambar utama dengan image_gallery jika ada
  const gallery = [product.image_url];
  if (product.image_gallery && Array.isArray(product.image_gallery)) {
    product.image_gallery.forEach((img: string) => {
      if (img && !gallery.includes(img)) gallery.push(img);
    });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 md:py-16">
      <button onClick={() => router.back()} className="mb-8 px-4 py-2 bg-white font-black border-4 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform flex items-center gap-2">
        ← KEMBALI
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
        {/* KOLOM KIRI: GAMBAR */}
        <div className="space-y-4">
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 md:p-8 flex items-center justify-center relative min-h-[300px] md:min-h-[400px]">
            {product.stock <= 5 && product.stock > 0 && (
              <span className="absolute top-4 left-4 text-xs md:text-sm font-black uppercase bg-red-400 text-white border-2 border-black px-2 py-1 transform -rotate-3 z-10 animate-pulse shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                Sisa {product.stock}!
              </span>
            )}
            {product.stock === 0 && (
              <span className="absolute top-4 left-4 text-xs md:text-sm font-black uppercase bg-gray-500 text-white border-2 border-black px-2 py-1 transform -rotate-3 z-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                HABIS
              </span>
            )}
            <img src={mainImage} alt={product.name} className="max-w-full max-h-[400px] object-contain drop-shadow-2xl mix-blend-darken hover:scale-105 transition-transform" />
          </div>

          {/* GALERI THUMBNAILS (Jika > 1 gambar) */}
          {gallery.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {gallery.map((img, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setMainImage(img)}
                  className={`flex-shrink-0 w-24 h-24 bg-white border-4 border-black flex items-center justify-center p-2 cursor-pointer transition-all ${mainImage === img ? 'shadow-[inset_0px_0px_0px_4px_black] border-black scale-105' : 'hover:-translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}
                >
                  <img src={img} alt={`${product.name} - Thumbnail ${idx + 1}`} className="max-w-full max-h-full object-contain mix-blend-darken" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* KOLOM KANAN: DETAIL INFO */}
        <div className="flex flex-col">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="bg-pink-300 font-black uppercase text-xs md:text-sm px-2 py-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              {product.category}
            </span>
            {product.series && (
              <span className="bg-blue-300 font-black uppercase text-xs md:text-sm px-2 py-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                {product.series}
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-5xl font-black uppercase leading-tight mb-4 break-words">
            {product.name}
          </h1>

          <div className="mb-8">
            <span className="text-2xl md:text-4xl font-black bg-yellow-300 px-3 py-1 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] inline-block transform -rotate-1">
              {formatRupiah(product.price)}
            </span>
          </div>

          <div className="bg-white border-4 border-black p-4 md:p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mb-8 flex-1">
            <h3 className="font-black uppercase text-lg border-b-4 border-black pb-2 mb-4">Detail Produk</h3>
            <div className="space-y-4">
              <div className="flex justify-between font-bold text-sm md:text-base border-b-2 border-gray-200 border-dashed pb-2">
                <span className="opacity-70">SKU</span>
                <span>{product.sku || "-"}</span>
              </div>
              <div className="flex justify-between font-bold text-sm md:text-base border-b-2 border-gray-200 border-dashed pb-2">
                <span className="opacity-70">Kondisi</span>
                <span>Baru (MISB)</span>
              </div>
              <div className="flex justify-between font-bold text-sm md:text-base border-b-2 border-gray-200 border-dashed pb-2">
                <span className="opacity-70">Stok Tersedia</span>
                <span>{product.stock > 0 ? product.stock : "Habis"}</span>
              </div>
            </div>
            
            <h3 className="font-black uppercase text-lg border-b-4 border-black pb-2 mb-4 mt-6">Deskripsi</h3>
            <p className="font-bold whitespace-pre-wrap opacity-90 leading-relaxed text-sm md:text-base">
              {product.description || "Tidak ada deskripsi."}
            </p>
          </div>

          <button 
            onClick={() => {
              if (product.stock > 0) {
                addItem({ ...product, quantity: 1 } as any);
                alert(`🛒 ${product.name} masuk keranjang!`);
              }
            }}
            disabled={product.stock === 0}
            className={`w-full py-4 text-xl md:text-2xl font-black uppercase border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-4
              ${product.stock === 0 ? 'bg-gray-300 cursor-not-allowed opacity-50' : 'bg-green-400 hover:bg-green-500 hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}
            `}
          >
            {product.stock === 0 ? "STOK HABIS ❌" : "ADD TO CART 🛒"}
          </button>
        </div>
      </div>
    </div>
  );
}
