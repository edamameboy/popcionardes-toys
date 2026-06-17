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
  // B. DISKON NOMINAL (Mengakomodasi sistem lama & baru)
  else if (voucher.type === 'FIXED' || voucher.discount_amount > 0) {
    if (subtotal >= (voucher.min_purchase || 0)) {
      discountTotal = voucher.discount_value || voucher.discount_amount;
    }
  }
  // C. 🛒 BUY X GET Y (PRODUK TERMURAH GRATIS)
  else if (voucher.type === 'BUY_X_GET_Y') {
    const minQty = voucher.details?.min_qty_required || 2;
    const freeQty = voucher.details?.free_qty_given || 1;
    const totalItemsInCart = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    if (totalItemsInCart >= minQty) {
      // Pecah keranjang jadi array harga satuan [100000, 50000, 50000]
      let allPrices: number[] = [];
      cartItems.forEach(item => {
        for (let i = 0; i < item.quantity; i++) { allPrices.push(item.price); }
      });
      // Urutkan dari yang termurah ke termahal
      allPrices.sort((a, b) => a - b);

      // Hitung kelipatan gratisnya
      const timesPromoApplied = Math.floor(totalItemsInCart / minQty);
      const totalFreeItems = timesPromoApplied * freeQty;

      // Jumlahkan N barang termurah sebagai nilai diskon
      for (let i = 0; i < totalFreeItems; i++) {
        if (allPrices[i]) discountTotal += allPrices[i];
      }
    }
  }

  return discountTotal;
};

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  // Data User & Profil
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);

  // State untuk Integrasi Biteship
  const [availableCouriers, setAvailableCouriers] = useState<any[]>([]);
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<any>(null);
  
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  
  const [myVouchers, setMyVouchers] = useState<any[]>([]);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  const calculatedTotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const grandTotal = Math.max(0, calculatedTotal + (selectedCourier?.price || 0) - discountAmount);

  const [formData, setFormData] = useState({ name: "", phone: "", address: "", postalCode: "" });

  // 1. CEK AUTHENTICATION & TARIK PROFIL OTOMATIS
  useEffect(() => {
    setMounted(true);
    
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("⚠️ Anda harus login dulu untuk bisa Checkout!");
        router.push("/login");
        return;
      }
      setUser(user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        // Otomatis isi form dari database
        setFormData({
          name: profileData.full_name || "",
          phone: profileData.phone || "",
          address: profileData.address || "",
          postalCode: profileData.postal_code || "",
        });

        // Deteksi jika data penting ada yang kosong
        if (!profileData.full_name || !profileData.phone || !profileData.address || !profileData.postal_code) {
          setIsProfileIncomplete(true);
        }
        // Ambil kupon yang belum terpakai
        const { data: vouchersData } = await supabase
          .from("user_vouchers")
          .select("*, voucher:vouchers(*)")
          .eq("user_id", user.id)
          .eq("is_used", false);
        setMyVouchers(vouchersData || []);
      }
      setIsAuthChecking(false);
    };

    checkAuth();
  }, []);

  // 2. AUTO-FETCH ONGKIR SAAT KODE POS TERISI (DARI PROFIL)
  useEffect(() => {
    if (formData.postalCode && formData.postalCode.length === 5) {
      const getRates = async () => {
        setIsFetchingRates(true);
        setAvailableCouriers([]);
        setSelectedCourier(null);
        try {
          const res = await fetch("/api/shipping", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ destinationPostalCode: formData.postalCode })
          });
          const data = await res.json();
          
          if (res.ok && data.rates && data.rates.length > 0) {
            setAvailableCouriers(data.rates);
            setSelectedCourier(data.rates[0]); 
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsFetchingRates(false);
        }
      };
      getRates();
    }
  }, [formData.postalCode]);

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

  if (!mounted || isAuthChecking) return (
    <div className="min-h-[70vh] flex items-center justify-center font-black text-2xl uppercase">
      Memeriksa Akses Keamanan... 🔐
    </div>
  );

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-6 p-6 text-center">
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">Keranjang Kosong!</h1>
        <Link href="/">
          <button className="px-8 py-4 mt-4 font-black uppercase bg-yellow-400 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1.5 hover:translate-y-1.5 transition-all">
            Kembali Belanja
          </button>
        </Link>
      </div>
    );
  }

  // JIKA PROFIL BELUM LENGKAP -> BLOKIR CHECKOUT
  if (isProfileIncomplete) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-6 p-6 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-red-600 bg-yellow-200 border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          TUNGGU DULU BOS! 🛑
        </h1>
        <p className="font-bold text-xl">
          Kami tidak tahu harus mengirim pesanan ini ke mana. Alamat atau Kode Pos Anda belum lengkap!
        </p>
        <Link href="/profile">
          <button className="px-8 py-4 mt-4 font-black uppercase bg-green-400 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1.5 hover:translate-y-1.5 transition-all text-xl">
            Lengkapi Profil Sekarang ✍️
          </button>
        </Link>
      </div>
    );
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourier) return alert("Pilih kurir terlebih dahulu!");
    
    setIsLoading(true);

    try {
      // Kirim user.id agar order terekam sebagai milik user yang login
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          formData, 
          items, 
          total: calculatedTotal,
          courier: `${selectedCourier.company} - ${selectedCourier.type}`,
          shippingCost: selectedCourier.price,
          userId: user.id,
          userVoucherId: selectedVoucherId || null, // <-- Kirim ID voucher ke backend
          discountAmount: discountAmount // <-- Kirim nilai diskon ke backend
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memproses pembayaran");

      (window as any).snap.pay(data.token, {
        onSuccess: function () {
          alert("🔥 Pembayaran Berhasil! Cek status pesanan di dashboard.");
          clearCart();
          router.push("/"); // Kembali ke halaman utama setelah sukses
        },
        onPending: function () { alert("⏳ Menunggu pembayaran Anda!"); },
        onError: function () { alert("❌ Pembayaran Gagal! Coba lagi."); },
        onClose: function () { alert("⚠️ Popup ditutup sebelum bayar."); }
      });

    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Script src="https://app.sandbox.midtrans.com/snap/snap.js" data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY} strategy="lazyOnload" />

      <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-8">
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter border-b-4 border-black pb-4">
          Checkout
        </h1>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* === KIRI: Form Pengiriman Terkunci === */}
          <div className="flex-1 space-y-8">
            <div className="bg-white p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
              
              {/* Tombol Pintasan ke Profil */}
              <div className="absolute top-6 right-6">
                <Link href="/profile" className="bg-yellow-400 text-xs font-black uppercase border-2 border-black px-3 py-1 hover:bg-black hover:text-white transition-all">
                  Ubah Alamat
                </Link>
              </div>

              <h2 className="text-2xl font-black uppercase mb-6 bg-blue-300 inline-block px-2 border-2 border-black">
                Data Pengiriman
              </h2>
              
              <div className="space-y-4 opacity-80 pointer-events-none">
                <div className="space-y-2">
                  <label className="font-bold uppercase text-sm">Nama Lengkap</label>
                  <input type="text" readOnly value={formData.name} className="w-full p-3 border-4 border-black bg-gray-100 font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="font-bold uppercase text-sm">Nomor WA</label>
                    <input type="text" readOnly value={formData.phone} className="w-full p-3 border-4 border-black bg-gray-100 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-bold uppercase text-sm">Kode Pos</label>
                    <input type="text" readOnly value={formData.postalCode} className="w-full p-3 border-4 border-black bg-gray-100 font-bold" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="font-bold uppercase text-sm">Alamat Lengkap</label>
                  <textarea rows={3} readOnly value={formData.address} className="w-full p-3 border-4 border-black bg-gray-100 font-bold resize-none" />
                </div>
              </div>
            </div>

            {/* SEKSI PILIH KURIR (DINAMIS DARI BITESHIP CACHE) */}
            <div className="bg-white p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-2xl font-black uppercase mb-6 bg-yellow-400 inline-block px-2 border-2 border-black">
                Pilih Kurir
              </h2>
              
              {isFetchingRates ? (
                <div className="p-6 border-4 border-black bg-gray-200 text-center font-black uppercase animate-pulse">
                  Mencari Truk Kurir... 🚚💨
                </div>
              ) : availableCouriers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {availableCouriers.map((courier) => (
                    <div 
                      key={`${courier.company}-${courier.type}`}
                      onClick={() => !isLoading && setSelectedCourier(courier)}
                      className={`p-4 border-4 border-black cursor-pointer transition-all flex flex-col space-y-2
                        ${selectedCourier?.type === courier.type && selectedCourier?.company === courier.company
                          ? "bg-black text-white shadow-none translate-x-1 translate-y-1" 
                          : "bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100"
                        }
                        ${isLoading && "opacity-50 cursor-not-allowed"}
                      `}
                    >
                      <span className="font-black uppercase">{courier.company} ({courier.type})</span>
                      <span className="text-sm font-bold opacity-80">
                        {courier.duration ? `Estimasi: ${courier.duration}` : "Reguler"}
                      </span>
                      <span className={`text-lg font-black mt-auto p-1 border-2 ${selectedCourier?.type === courier.type && selectedCourier?.company === courier.company ? "bg-white text-black border-white" : "bg-gray-200 border-black inline-block self-start"}`}>
                        {formatRupiah(courier.price)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 border-4 border-black bg-red-200 text-center font-bold">
                  Gagal mendapatkan kurir. Cek kembali kodepos Anda.
                </div>
              )}
            </div>
          </div>

          {/* === KANAN: Ringkasan Pesanan === */}
          <div className="lg:w-1/3 space-y-6">
            <div className="bg-pink-300 p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sticky top-24">
              <h2 className="text-2xl font-black uppercase mb-6 bg-white inline-block px-2 border-2 border-black">
                Ringkasan
              </h2>

              <div className="space-y-4 mb-4 border-b-4 border-black pb-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center font-bold">
                    <div className="flex-1">
                      <p className="uppercase leading-tight">{item.name}</p>
                      <p className="text-sm">x{item.quantity}</p>
                    </div>
                    <p className="bg-white px-2 border-2 border-black">{formatRupiah(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>

                {/* --- DROPDOWN PILIH KUPON --- */}
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

              {/* Rincian Harga dengan Potongan Diskon */}
              <div className="space-y-2 mb-6 border-b-4 border-black pb-6 font-bold text-sm">
                <div className="flex justify-between">
                  <span>Subtotal Barang</span>
                  <span>{formatRupiah(calculatedTotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Ongkos Kirim</span>
                  <span className={!selectedCourier ? "text-red-500" : ""}>
                    {selectedCourier ? formatRupiah(selectedCourier.price) : "Pilih kurir"}
                  </span>
                </div>
                {/* Tampilkan baris diskon merah jika ada */}
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-red-600 font-black text-base mt-2">
                    <span>Diskon Kupon</span>
                    <span>- {formatRupiah(discountAmount)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-end mb-8">
                <span className="font-black uppercase text-xl">Total</span>
                <span className="font-black text-2xl bg-white px-2 py-1 border-4 border-black transform rotate-2">
                  {formatRupiah(grandTotal)}
                </span>
              </div>

              <button 
                onClick={handleCheckout}
                disabled={isLoading || !selectedCourier}
                className={`w-full py-4 text-xl font-black uppercase border-4 border-black transition-all ${
                  isLoading || !selectedCourier
                  ? "bg-gray-400 opacity-70 translate-x-1.5 translate-y-1.5 shadow-none cursor-not-allowed" 
                  : "bg-green-400 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1.5 hover:translate-y-1.5"
                }`}
              >
                {!selectedCourier ? "Pilih Kurir Dulu" : isLoading ? "Memproses..." : "Bayar Sekarang"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}