"use client";

import React, { useEffect, useState } from "react";
import { useCartStore } from "@/store/useCartStore";
import Link from "next/link";

// Format Rupiah
const formatRupiah = (angka: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
};

export default function CheckoutPage() {
  const [mounted, setMounted] = useState(false);
  const { items, totalPrice } = useCartStore();

  // State untuk form pengiriman (sementara statis sebelum Biteship)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
  });

  // Mencegah hydration error
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Jika keranjang kosong
  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-6 p-6 text-center">
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
          Keranjang Kosong!
        </h1>
        <p className="text-xl font-bold bg-white p-2 border-4 border-black inline-block shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          Masa nggak beli apa-apa? Ayo jajan dulu.
        </p>
        <Link href="/">
          <button className="px-8 py-4 mt-4 font-black uppercase bg-yellow-400 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1.5 hover:translate-y-1.5 transition-all">
            Kembali Belanja
          </button>
        </Link>
      </div>
    );
  }

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    // Di tahap selanjutnya, fungsi ini akan memanggil Server Action untuk Midtrans
    console.log("Data Pesanan:", { formData, items, total: totalPrice() });
    alert("Siap memproses pembayaran! (Integrasi Midtrans menyusul di tahap berikutnya)");
  };

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-8">
      <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter border-b-4 border-black pb-4">
        Checkout
      </h1>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Form Pengiriman (Kiri) */}
        <div className="flex-1 space-y-6">
          <div className="bg-white p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-2xl font-black uppercase mb-6 bg-blue-300 inline-block px-2 border-2 border-black">
              Data Pengiriman
            </h2>
            
            <form id="checkout-form" onSubmit={handleCheckout} className="space-y-4">
              <div className="space-y-2">
                <label className="font-bold uppercase text-sm">Nama Lengkap</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 border-4 border-black bg-[#fefce8] focus:bg-white focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all font-bold"
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <label className="font-bold uppercase text-sm">Nomor WhatsApp</label>
                <input 
                  type="tel" 
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full p-3 border-4 border-black bg-[#fefce8] focus:bg-white focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all font-bold"
                  placeholder="081234567890"
                />
              </div>

              <div className="space-y-2">
                <label className="font-bold uppercase text-sm">Alamat Lengkap</label>
                <textarea 
                  required
                  rows={4}
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full p-3 border-4 border-black bg-[#fefce8] focus:bg-white focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all font-bold resize-none"
                  placeholder="Jl. Neo Brutalism No. 99, Jakarta..."
                />
              </div>
            </form>
          </div>
        </div>

        {/* Ringkasan Pesanan (Kanan) */}
        <div className="lg:w-1/3 space-y-6">
          <div className="bg-pink-300 p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sticky top-24">
            <h2 className="text-2xl font-black uppercase mb-6 bg-white inline-block px-2 border-2 border-black">
              Ringkasan
            </h2>

            <div className="space-y-4 mb-6 border-b-4 border-black pb-6">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-center font-bold">
                  <div className="flex-1">
                    <p className="uppercase leading-tight">{item.name}</p>
                    <p className="text-sm">x{item.quantity}</p>
                  </div>
                  <p className="bg-white px-2 border-2 border-black">
                    {formatRupiah(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-end mb-8">
              <span className="font-black uppercase text-xl">Total</span>
              <span className="font-black text-2xl bg-white px-2 py-1 border-4 border-black transform rotate-2">
                {formatRupiah(totalPrice())}
              </span>
            </div>

            <button 
              form="checkout-form"
              type="submit"
              className="w-full py-4 text-xl font-black uppercase bg-green-400 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1.5 hover:translate-y-1.5 transition-all"
            >
              Bayar Sekarang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}