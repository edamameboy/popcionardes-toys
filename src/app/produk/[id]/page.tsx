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
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"description" | "more_info" | "shipping">("description");

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
      if (data) {
        setProduct(data);
        setMainImage(data.image_url);
        
        // Ambil produk rekomendasi di kategori yang sama
        const { data: related } = await supabase
          .from("products")
          .select("*")
          .eq("category", data.category)
          .neq("id", data.id)
          .limit(2);
        
        if (related) setRelatedProducts(related);
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
        {/* KOLOM KIRI: GAMBAR */}
        <div className="space-y-4">
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 md:p-8 flex items-center justify-center relative min-h-[400px] md:min-h-[500px]">
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
            <img src={mainImage} alt={product.name} className="max-w-full max-h-[500px] object-contain drop-shadow-2xl mix-blend-darken hover:scale-105 transition-transform" />
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

          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black uppercase leading-tight mb-4 break-words">
            {product.name}
          </h1>

          <div className="mb-6">
            <span className="text-2xl md:text-4xl font-black bg-yellow-300 px-3 py-1 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] inline-block transform -rotate-1">
              {formatRupiah(product.price)}
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-end mb-6">
            <div className="bg-gray-50 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-sm font-bold space-y-2">
              <div className="flex justify-between border-b-2 border-dashed border-gray-300 pb-1">
                <span className="opacity-70">SKU</span>
                <span>{product.sku || "-"}</span>
              </div>
              {product.series && (
                <div className="flex justify-between border-b-2 border-dashed border-gray-300 pb-1">
                  <span className="opacity-70">Series</span>
                  <span>{product.series}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="opacity-70">Kondisi</span>
                <span className="text-green-600">Baru (MISB)</span>
              </div>
            </div>
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

      {/* BOTTOM SECTION: DESKRIPSI & RELATED PRODUCTS */}
      <div className="mt-8 md:mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* KIRI: TABS */}
        <div className="lg:col-span-2 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] self-start flex flex-col">
          {/* TAB HEADERS */}
          <div className="flex border-b-4 border-black overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveTab("description")}
              className={`flex-1 py-3 px-2 md:px-4 font-black uppercase text-xs md:text-sm border-r-4 border-black transition-all whitespace-nowrap ${activeTab === 'description' ? 'bg-white text-black' : 'bg-black text-white hover:bg-gray-800'}`}
            >
              Description
            </button>
            <button 
              onClick={() => setActiveTab("more_info")}
              className={`flex-1 py-3 px-2 md:px-4 font-black uppercase text-xs md:text-sm border-r-4 border-black transition-all whitespace-nowrap ${activeTab === 'more_info' ? 'bg-white text-black' : 'bg-black text-white hover:bg-gray-800'}`}
            >
              More Information
            </button>
            <button 
              onClick={() => setActiveTab("shipping")}
              className={`flex-1 py-3 px-2 md:px-4 font-black uppercase text-xs md:text-sm transition-all whitespace-nowrap ${activeTab === 'shipping' ? 'bg-white text-black' : 'bg-black text-white hover:bg-gray-800'}`}
            >
              Shipping & Return
            </button>
          </div>

          {/* TAB CONTENT */}
          <div className="p-4 md:p-8">
            {activeTab === "description" && (
              <div className="font-bold opacity-90 leading-relaxed text-sm md:text-base whitespace-pre-wrap">
                {product.description ? (
                  <>
                    <p>
                      {isDescExpanded || product.description.length <= 400 
                        ? product.description 
                        : `${product.description.slice(0, 400)}...`}
                    </p>
                    {product.description.length > 400 && (
                      <button 
                        onClick={() => setIsDescExpanded(!isDescExpanded)}
                        className="mt-4 bg-yellow-300 px-4 py-2 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black uppercase text-xs md:text-sm transition-all"
                      >
                        {isDescExpanded ? "Sembunyikan Deskripsi" : "Baca Selengkapnya"}
                      </button>
                    )}
                  </>
                ) : (
                  "Tidak ada deskripsi."
                )}
              </div>
            )}

            {activeTab === "more_info" && (
              <div className="space-y-4 font-bold text-sm md:text-base">
                <div className="flex justify-between border-b-2 border-gray-200 border-dashed pb-2">
                  <span className="opacity-70">SKU</span>
                  <span>{product.sku || "-"}</span>
                </div>
                <div className="flex justify-between border-b-2 border-gray-200 border-dashed pb-2">
                  <span className="opacity-70">Kategori</span>
                  <span>{product.category || "-"}</span>
                </div>
                <div className="flex justify-between border-b-2 border-gray-200 border-dashed pb-2">
                  <span className="opacity-70">Series</span>
                  <span>{product.series || "-"}</span>
                </div>
                <div className="flex justify-between border-b-2 border-gray-200 border-dashed pb-2">
                  <span className="opacity-70">Kondisi</span>
                  <span>Baru (MISB)</span>
                </div>
                <div className="flex justify-between border-b-2 border-gray-200 border-dashed pb-2">
                  <span className="opacity-70">Stok Tersedia</span>
                  <span>{product.stock > 0 ? product.stock : "Habis"}</span>
                </div>
              </div>
            )}

            {activeTab === "shipping" && (
              <div className="font-bold opacity-90 leading-relaxed text-sm md:text-base space-y-6">
                <div>
                  <h4 className="font-black text-lg mb-2 underline decoration-4 decoration-yellow-300">Pengiriman</h4>
                  <p>Pesanan yang dibayar sebelum pukul 15:00 WIB akan dikirim pada hari yang sama. Pengiriman menggunakan proteksi bubble wrap tebal dan kardus khusus (double wall) untuk memastikan kondisi boks POP! tetap mulus saat tiba di tangan Anda.</p>
                </div>
                <div>
                  <h4 className="font-black text-lg mb-2 underline decoration-4 decoration-pink-300">Kebijakan Retur</h4>
                  <p>Kami tidak menerima retur/refund akibat kerusakan saat pengiriman oleh kurir (penyok dll.). Retur hanya berlaku jika terdapat cacat pabrik (factory defect) atau barang yang dikirim tidak sesuai pesanan. <strong>Wajib menyertakan video unboxing</strong> (tanpa jeda/edit) dari awal paket belum dibuka.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* KANAN: REKOMENDASI PRODUK */}
        {relatedProducts.length > 0 && (
          <div className="lg:col-span-1 flex flex-col gap-4">
            <h3 className="font-black uppercase text-lg bg-black text-white px-3 py-2 border-4 border-black inline-block transform -rotate-1 self-start shadow-[4px_4px_0px_0px_rgba(255,215,0,1)]">
              JANGAN LUPAKAN INI!
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {relatedProducts.map(rp => (
                <div key={rp.id} className="bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 flex gap-4 items-center hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
                  <div className="w-20 h-20 bg-gray-100 border-2 border-black flex-shrink-0 flex items-center justify-center p-1">
                    <img src={rp.image_url} alt={rp.name} className="max-w-full max-h-full object-contain mix-blend-darken" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/produk/${rp.id}`}>
                      <h4 className="font-black uppercase text-xs truncate hover:text-blue-600 transition-colors">{rp.name}</h4>
                    </Link>
                    <p className="font-black text-sm bg-yellow-300 inline-block px-1 border-2 border-black mb-2 mt-1">{formatRupiah(rp.price)}</p>
                    <button 
                      onClick={() => {
                        if (rp.stock > 0) {
                          addItem({ ...rp, quantity: 1 } as any);
                          alert(`🛒 ${rp.name} masuk keranjang!`);
                        }
                      }}
                      disabled={rp.stock === 0}
                      className={`w-full py-1 text-[10px] font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all
                        ${rp.stock === 0 ? 'bg-gray-300 opacity-50 cursor-not-allowed' : 'bg-green-400 hover:bg-green-500 active:translate-y-0.5 active:shadow-none'}
                      `}
                    >
                      {rp.stock === 0 ? 'HABIS' : 'ADD TO CART'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
