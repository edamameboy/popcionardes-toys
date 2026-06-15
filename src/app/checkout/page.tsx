"use client";

import React, { useEffect, useState } from "react";
import { useCartStore } from "@/store/cart";
import Link from "next/link";
import Script from "next/script"; // Import untuk memuat script Midtrans

// Fungsi Format Rupiah
const formatRupiah = (angka: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
};

export default function CheckoutPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // State loading untuk tombol bayar
  
  // Ambil state dari Zustand
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  
  // Kalkulasi total harga
  const calculatedTotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  // State untuk form pengiriman
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

  // Tampilan jika keranjang kosong
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

  // --- FUNGSI PROSES PEMBAYARAN MIDTRANS ---
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Minta Token Transaksi dari API Route kita
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData, items, total: calculatedTotal }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal memproses pembayaran ke server");
      }

      // 2. Panggil Popup Midtrans Snap menggunakan token yang didapat
      (window as any).snap.pay(data.token, {
        onSuccess: function (result: any) {
          alert("🔥 Pembayaran Berhasil! Pesanan segera diproses.");
          clearCart(); // Kosongkan keranjang setelah sukses
          console.log(result);
        },
        onPending: function (result: any) {
          alert("⏳ Menunggu pembayaran Anda!");
          console.log(result);
        },
        onError: function (result: any) {
          alert("❌ Pembayaran Gagal! Coba lagi.");
          console.log(result);
        },
        onClose: function () {
          alert("⚠️ Yah, kok ditutup popup-nya? Belum selesai bayar loh.");
        }
      });

    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Suntik Script Midtrans secara dinamis dari Next.js */}
      <Script 
        src="https://app.sandbox.midtrans.com/snap/snap.js"
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="lazyOnload"
      />

      <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-8">
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter border-b-4 border-black pb-4">
          Checkout
        </h1>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* === KIRI: Form Pengiriman === */}
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
                    disabled={isLoading}
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
                    disabled={isLoading}
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
                    disabled={isLoading}
                  />
                </div>
              </form>
            </div>
          </div>

          {/* === KANAN: Ringkasan Pesanan === */}
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
                  {formatRupiah(calculatedTotal)}
                </span>
              </div>

              <button 
                form="checkout-form"
                type="submit"
                disabled={isLoading}
                className={`w-full py-4 text-xl font-black uppercase border-4 border-black transition-all ${
                  isLoading 
                  ? "bg-gray-400 opacity-70 translate-x-1.5 translate-y-1.5 shadow-none cursor-not-allowed" 
                  : "bg-green-400 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1.5 hover:translate-y-1.5"
                }`}
              >
                {isLoading ? "Memproses..." : "Bayar Sekarang"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}