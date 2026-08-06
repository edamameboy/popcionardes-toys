"use client";

import React, { useEffect, useState } from "react";
import { useCartStore } from "@/store/cart";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const formatRupiah = (angka: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
};

const calculateVoucherDiscount = (cartItems: any[], voucher: any) => {
  if (!voucher) return 0;
  let discountTotal = 0;
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // A. DISKON PERSEN
  if (voucher.type === 'PERCENTAGE') {
    if (subtotal >= (voucher.min_purchase || 0)) {
      discountTotal = subtotal * (voucher.discount_value / 100);
      if (voucher.max_discount > 0 && discountTotal > voucher.max_discount) {
        discountTotal = voucher.max_discount;
      }
    }
  } 
  
  // B. 🛒 BUY X GET Y (PRODUK TERMURAH GRATIS)
  // Dipindah ke atas agar aman dari deteksi sistem poin/voucher lama
  else if (voucher.type === 'BUY_X_GET_Y') {
    const buyX = voucher.details?.min_qty_required || 1; // Jumlah yang DIBAYAR
    const getY = voucher.details?.free_qty_given || 1;   // Jumlah GRATIS
    
    // RUMUS YANG BENAR: Total 1 Paket = Bayar (X) + Gratis (Y)
    const groupSize = buyX + getY; 

    const totalItemsInCart = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    // Cek apakah keranjang memenuhi minimal 1 paket promo
    if (totalItemsInCart >= groupSize) {
      
      // Pecah keranjang jadi deretan harga satuan
      let allPrices: number[] = [];
      cartItems.forEach(item => {
        for (let i = 0; i < item.quantity; i++) { allPrices.push(item.price); }
      });
      
      // Urutkan dari yang termurah ke termahal
      allPrices.sort((a, b) => a - b);

      // Hitung kelipatan promo yang didapat (Misal total 6 barang dibagi paket isi 3 = dapat 2x promo)
      const timesPromoApplied = Math.floor(totalItemsInCart / groupSize);
      const totalFreeItems = timesPromoApplied * getY;

      // Jumlahkan barang termurah sebagai diskon akhir
      for (let i = 0; i < totalFreeItems; i++) {
        if (allPrices[i]) discountTotal += allPrices[i];
      }
    }
  }
  
  // C. DISKON NOMINAL (Ditaruh paling bawah sebagai Fallback sistem lama)
  else if (voucher.type === 'FIXED' || voucher.discount_amount > 0) {
    if (subtotal >= (voucher.min_purchase || 0)) {
      discountTotal = voucher.discount_value || voucher.discount_amount;
    }
  }

  return discountTotal;
};

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);

  // ==========================================
  // ZUSTAND HOOKS (WAJIB BERADA DI SINI)
  // ==========================================
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const decreaseQuantity = useCartStore((state) => state.decreaseQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  // State Form & Pengiriman
  const [formData, setFormData] = useState({ name: "", phone: "", address: "", postalCode: "" });
  const [couriers, setCouriers] = useState<any[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<any>(null);
  const [isFetchingShipping, setIsFetchingShipping] = useState(false);

  // State Voucher Sultan
  const [myVouchers, setMyVouchers] = useState<any[]>([]);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  useEffect(() => {
    setMounted(true);
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");
    setUser(user);

    // 1. Cek Kelengkapan Profil
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!profile || !profile.full_name || !profile.phone || !profile.address || !profile.postal_code) {
      setIsProfileIncomplete(true);
    } else {
      setFormData({
        name: profile.full_name,
        phone: profile.phone,
        address: profile.address,
        postalCode: profile.postal_code,
      });
      // Tarik Ongkir Otomatis dari kodepos
      fetchShippingOptions(profile.postal_code);
    }

    // 2. Tarik Kupon Promo Milik User
    const { data: vouchersData } = await supabase
      .from("user_vouchers")
      .select("*, voucher:vouchers(*)")
      .eq("user_id", user.id)
      .eq("is_used", false);
    setMyVouchers(vouchersData || []);
  };

  const fetchShippingOptions = async (postalCode: string) => {
    if (!postalCode || postalCode.length < 5) return;
    setIsFetchingShipping(true);
    try {
      const res = await fetch("/api/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinationPostalCode: postalCode }),
      });
      const data = await res.json();
      if (data.rates) setCouriers(data.rates);
    } catch (error) { 
      console.error("Gagal mengambil ongkir", error); 
    } finally { 
      setIsFetchingShipping(false); 
    }
  };

  useEffect(() => {
    if (!selectedVoucherId) {
      setDiscountAmount(0);
      return;
    }
    const selected = myVouchers.find(v => v.id === selectedVoucherId);
    if (selected && selected.voucher) {
      const calculatedDiscount = calculateVoucherDiscount(items, selected.voucher);
      setDiscountAmount(calculatedDiscount);
    }
  }, [selectedVoucherId, items, myVouchers]);
  
  const handleCheckout = async () => {
    if (!selectedCourier) return alert("Pilih kurir pengiriman terlebih dahulu!");
    if (items.length === 0) return alert("Keranjang masih kosong!");

    setIsLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formData,
          items,
          total: calculatedTotal,
          courier: `${selectedCourier.company} - ${selectedCourier.type}`,
          shippingCost: selectedCourier.price,
          userId: user.id,
          userVoucherId: selectedVoucherId || null,
          discountAmount: discountAmount
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat transaksi");

      // Tembak Midtrans Snap
      (window as any).snap.pay(data.token, {
        onSuccess: function () {
          alert("Pembayaran Berhasil! Pesanan diproses.");
          router.push("/orders");
        },
        onPending: function () {
          alert("Menunggu pembayaran...");
          router.push("/orders");
        },
        onError: function () { alert("Pembayaran Gagal!"); },
        onClose: function () { alert("Kamu menutup pop-up sebelum membayar."); },
      });
    } catch (error: any) { 
      alert(`Error: ${error.message}`); 
    } finally { 
      setIsLoading(false); 
    }
  };

  if (!mounted) return null;

  // LAYAR 1: JIKA KERANJANG KOSONG
  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col justify-center items-center space-y-6">
        <h1 className="text-4xl font-black uppercase text-center">Keranjangmu Sepi! 🛒</h1>
        <p className="font-bold">Ayo temukan Funko POP incaranmu.</p>
        <Link href="/">
          <button className="px-6 py-3 bg-yellow-400 font-black uppercase border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
            Mulai Belanja
          </button>
        </Link>
      </div>
    );
  }

  // LAYAR 2: JIKA PROFIL BELUM LENGKAP
  if (isProfileIncomplete) {
    return (
      <div className="min-h-[70vh] flex flex-col justify-center items-center space-y-6">
        <h1 className="text-4xl font-black uppercase text-center">Tunggu Dulu! 🛑</h1>
        <p className="font-bold text-center max-w-md">Data profil dan kodepos kamu belum lengkap. Lengkapi dulu agar kami bisa menghitung ongkos kirim.</p>
        <Link href="/profile">
          <button className="px-6 py-3 bg-green-400 font-black uppercase border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
            Lengkapi Profil
          </button>
        </Link>
      </div>
    );
  }

  // KALKULASI HARGA TOTAL
  const calculatedTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const grandTotal = Math.max(0, calculatedTotal + (selectedCourier?.price || 0) - discountAmount);

  // LAYAR 3: HALAMAN CHECKOUT UTAMA
  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-8">
      {/* Script Midtrans */}
      <Script src="https://app.sandbox.midtrans.com/snap/snap.js" data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY} strategy="lazyOnload" />

      <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter border-b-4 border-black pb-6">Checkout Kasir</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        
        {/* ========================================== */}
        {/* KIRI: ALAMAT & PILIHAN KURIR PENGIRIMAN */}
        {/* ========================================== */}
        <div className="space-y-8">
          
          <div className="bg-white p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-2xl font-black uppercase mb-6 bg-pink-300 inline-block px-2 border-2 border-black">Alamat Tujuan</h2>
            <div className="space-y-4 font-bold text-sm">
              <p className="uppercase text-lg border-b-2 border-black pb-2">{formData.name} <span className="text-gray-500 text-sm">({formData.phone})</span></p>
              <p className="leading-relaxed">{formData.address}</p>
              <p className="bg-yellow-200 inline-block px-2 py-1 border-2 border-black">Kodepos: {formData.postalCode}</p>
              <p className="text-xs text-blue-600 mt-2">*Untuk mengubah alamat, silakan pergi ke halaman Profil.</p>
            </div>
          </div>

          <div className="bg-white p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-2xl font-black uppercase mb-6 bg-blue-300 inline-block px-2 border-2 border-black">Opsi Pengiriman</h2>
            {isFetchingShipping ? (
              <p className="font-bold animate-pulse uppercase">Menghitung Ongkir... 🚚</p>
            ) : couriers.length === 0 ? (
              <p className="font-bold text-red-600">Kurir tidak tersedia ke kodepos tersebut.</p>
            ) : (
              <div className="space-y-3">
                {couriers.map((courier, index) => (
                  <label key={index} className={`flex justify-between items-center p-4 border-4 border-black cursor-pointer transition-all ${selectedCourier?.company === courier.company && selectedCourier?.type === courier.type ? "bg-yellow-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" : "bg-gray-50 hover:bg-gray-100"}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="courier" className="w-5 h-5 accent-black" checked={selectedCourier?.company === courier.company && selectedCourier?.type === courier.type} onChange={() => setSelectedCourier(courier)} />
                      <div>
                        <p className="font-black uppercase">{courier.company} - {courier.type}</p>
                        <p className="text-xs font-bold opacity-70">Estimasi: {courier.estimated_delivery} hari</p>
                      </div>
                    </div>
                    <span className="font-black text-lg">{formatRupiah(courier.price)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ========================================== */}
        {/* KANAN: RINGKASAN KERANJANG, VOUCHER & TOTAL */}
        {/* ========================================== */}
        <div className="space-y-8">
          
          {/* DAFTAR BARANG (DENGAN TOMBOL PLUS MINUS) */}
          <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-xl font-black uppercase mb-4 bg-yellow-300 inline-block px-2 border-2 border-black">
              Isi Keranjang ({items.reduce((acc, item) => acc + item.quantity, 0)})
            </h2>
            
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 border-2 border-black p-3 gap-4">
                  
                  {/* Info Barang */}
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-16 h-16 bg-white border-2 border-black shrink-0 flex items-center justify-center">
                      <img src={item.image_url} alt={item.name} className="max-w-full max-h-full object-contain mix-blend-darken" />
                    </div>
                    <div className="flex-1">
                      <p className="font-black uppercase leading-tight text-xs sm:text-sm line-clamp-2">{item.name}</p>
                      <p className="text-xs font-bold text-gray-500 mt-1">{formatRupiah(item.price)}</p>
                    </div>
                  </div>

                  {/* Kontrol + / - / Hapus */}
                  <div className="flex items-center gap-1 self-end sm:self-auto bg-white border-2 border-black">
                    <button onClick={() => decreaseQuantity(item.id)} className="w-8 h-8 flex items-center justify-center font-black bg-gray-100 hover:bg-red-400 hover:text-white transition-colors">-</button>
                    <span className="w-8 text-center font-black text-sm">{item.quantity}</span>
                    <button onClick={() => addItem(item)} disabled={item.quantity >= item.stock} className={`w-8 h-8 flex items-center justify-center font-black transition-colors ${item.quantity >= item.stock ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-100 hover:bg-green-400 hover:text-white'}`}>+</button>
                    <button onClick={() => removeItem(item.id)} className="w-8 h-8 flex items-center justify-center font-black border-l-2 border-black bg-red-100 hover:bg-red-600 hover:text-white transition-colors text-xs">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-2xl font-black uppercase mb-6 bg-green-400 inline-block px-2 border-2 border-black">Ringkasan</h2>
            
            {/* DROPDOWN KUPON PROMO */}
            {myVouchers.length > 0 && (
              <div className="mb-6 space-y-2 border-b-4 border-black pb-6">
                <label className="font-black uppercase text-sm">Pakai Kupon Diskon</label>
                <select 
                  value={selectedVoucherId}
                  onChange={(e) => setSelectedVoucherId(e.target.value)} // Cukup set ID saja, useEffect akan menghitung nominalnya
                  className="w-full p-3 border-4 border-black font-bold focus:bg-yellow-200 focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  <option value="">-- Pilih Kupon Sultan --</option>
                  {myVouchers.map(v => {
                    // Buat label diskon yang cantik sesuai tipenya
                    let discountLabel = "";
                    if (v.voucher.type === 'PERCENTAGE') discountLabel = `Diskon ${v.voucher.discount_value}%`;
                    else if (v.voucher.type === 'FIXED') discountLabel = `Potongan ${formatRupiah(v.voucher.discount_value || v.voucher.discount_amount)}`;
                    else if (v.voucher.type === 'BUY_X_GET_Y') discountLabel = `Beli ${v.voucher.details?.min_qty_required || 2} Gratis ${v.voucher.details?.free_qty_given || 1}`;
                    else if (v.voucher.type === 'FREE_ITEM') discountLabel = "Gratis Produk";
                    else discountLabel = `Potongan ${formatRupiah(v.voucher.discount_amount)}`; // Fallback sistem lama

                    return (
                      <option key={v.id} value={v.id}>
                        {v.voucher.name} ({discountLabel})
                      </option>
                    )
                  })}
                </select>
              </div>
            )}

            {/* RINCIAN BIAYA */}
            <div className="space-y-2 mb-6 border-b-4 border-black pb-6 font-bold text-sm">
              <div className="flex justify-between"><span>Subtotal Barang</span><span>{formatRupiah(calculatedTotal)}</span></div>
              <div className="flex justify-between items-center">
                <span>Ongkos Kirim</span>
                <span className={!selectedCourier ? "text-red-500" : ""}>{selectedCourier ? formatRupiah(selectedCourier.price) : "Pilih kurir"}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-red-600 font-black text-base mt-2">
                  <span>Diskon Kupon</span><span>- {formatRupiah(discountAmount)}</span>
                </div>
              )}
            </div>

            {/* TOTAL & TOMBOL BAYAR */}
            <div className="flex justify-between items-end mb-8">
              <span className="font-black uppercase text-xl">Total</span>
              <span className="font-black text-2xl bg-white px-2 py-1 border-4 border-black transform rotate-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                {formatRupiah(grandTotal)}
              </span>
            </div>

            <button 
              onClick={handleCheckout}
              disabled={isLoading || !selectedCourier}
              className={`w-full py-4 text-xl font-black uppercase border-4 border-black transition-all ${isLoading || !selectedCourier ? "bg-gray-400 opacity-70 translate-x-1 translate-y-1 shadow-none cursor-not-allowed" : "bg-green-400 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"}`}
            >
              {!selectedCourier ? "Pilih Kurir Dulu" : isLoading ? "Memproses..." : "Bayar Sekarang"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}