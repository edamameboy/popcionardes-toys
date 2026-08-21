"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { formatRupiah } from "@/utils/formatters";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [mounted, setMounted] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Tracking State
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchOrderDetail();
  }, [params.id]);

  const fetchOrderDetail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data: profileData } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      const userIsAdmin = profileData?.role === "admin";
      setIsAdmin(userIsAdmin);

      const { data: orderData, error } = await supabase
        .from("orders")
        .select("*, voucher:user_vouchers(vouchers(*))")
        .eq("id", params.id)
        .single();

      if (error) throw error;

      if (orderData.user_id !== user.id && !userIsAdmin) {
        alert("🚨 AKSES ILEGAL: Anda tidak berhak melihat pesanan ini!");
        return router.push("/orders");
      }

      setOrder(orderData);
    } catch (error: any) {
      console.error("Gagal memuat detail pesanan:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncPayment = async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const res = await fetch("/api/orders/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.id }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.status !== order.status) {
          if (!silent) alert(`Status pesanan diperbarui menjadi: ${data.status}`);
          fetchOrderDetail();
        } else {
          if (!silent) alert("Status belum berubah di Midtrans.");
        }
      } else {
        if (!silent) alert(`Gagal sinkronisasi: ${data.error || data.message}`);
      }
    } catch (error: any) {
      if (!silent) alert(`Error: ${error.message}`);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  // Auto-polling tiap 10 detik jika status masih pending
  useEffect(() => {
    let interval: any;
    if (order && order.status === "pending") {
      interval = setInterval(() => {
        handleSyncPayment(true);
      }, 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [order]);

  const handleTrackPackage = async () => {
    setIsTrackingModalOpen(true);
    if (trackingData) return; // Jika sudah ada, jangan fetch lagi

    setIsTrackingLoading(true);
    try {
      const res = await fetch(`/api/shipping/track?id=${order.biteship_tracking_id}&courier=${order.courier_name}`);
      const data = await res.json();
      if (res.ok) {
        setTrackingData(data);
      } else {
        alert("Gagal melacak pesanan.");
        setIsTrackingModalOpen(false);
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan jaringan saat melacak.");
      setIsTrackingModalOpen(false);
    } finally {
      setIsTrackingLoading(false);
    }
  };

  if (!mounted || isLoading) return <div className="min-h-screen flex justify-center items-center font-black text-2xl uppercase">Melacak Paket... 🛰️</div>;
  if (!order) return <div className="min-h-screen flex justify-center items-center font-black text-2xl uppercase text-red-500">Pesanan Tidak Ditemukan! ❌</div>;

  const subtotalBarang = order.items_data?.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0) || 0;
  const nilaiDiskon = order.voucher?.vouchers?.discount_amount || 0;

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto space-y-8 relative">

      {/* TOMBOL KEMBALI DINAMIS */}
      <Link href="/orders" className="inline-block">
        <button className="px-4 py-2 font-black uppercase bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all text-sm">
          ⬅️ Kembali ke Daftar Pesanan
        </button>
      </Link>

      {/* HEADER NOTA */}
      <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-black uppercase bg-gray-200 border-2 border-black px-2 py-0.5">
            Nota Pesanan: #{order.id.substring(0, 8).toUpperCase()}
          </span>
          <p className="text-sm font-bold opacity-70 mt-1">
            Dibuat pada: {new Date(order.created_at).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`text-sm font-black uppercase tracking-wider px-4 py-2 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
            ${order.status === "paid" && "bg-green-400"}
            ${order.status === "processing" && "bg-yellow-400"}
            ${order.status === "shipped" && "bg-blue-400 text-white"}
            ${order.status === "completed" && "bg-emerald-500 text-white"}
            ${order.status === "pending" && "bg-amber-300"}
            ${order.status === "cancelled" && "bg-red-400 text-white"}
          `}>
            {order.status === "shipped" ? "🚀 DIKIRIM" : order.status === "processing" ? "📦 DIPROSES" : order.status === "paid" ? "✅ LUNAS" : order.status === "completed" ? "🏁 SELESAI" : order.status === "pending" ? "⏳ MENUNGGU BAYAR" : "❌ BATAL"}
          </span>
          {order.status === "pending" && (
            <button
              onClick={() => handleSyncPayment(false)}
              disabled={isSyncing}
              className="text-xs font-black bg-blue-300 hover:bg-blue-400 border-2 border-black px-3 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all"
            >
              {isSyncing ? "Mengecek..." : "🔄 Cek Pembayaran"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* KIRI: DAFTAR BARANG & RINCIAN BIAYA */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-xl font-black uppercase mb-4 bg-yellow-300 inline-block px-2 border-2 border-black">Item Belanjaan</h2>
            <div className="space-y-4">
              {order.items_data && order.items_data.length > 0 ? (
                order.items_data.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-50 border-2 border-black p-3 font-bold">
                    <div>
                      <p className="uppercase leading-tight text-sm">{item.name}</p>
                      <p className="text-xs opacity-70">x{item.quantity} @ {formatRupiah(item.price)}</p>
                    </div>
                    <p className="bg-white px-2 border-2 border-black text-sm">{formatRupiah(item.price * item.quantity)}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs font-bold opacity-60 text-center">Data item tidak terekam pada transaksi lama.</p>
              )}
            </div>
          </div>

          <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-3 font-bold text-sm">
            <h2 className="text-xl font-black uppercase mb-2 bg-pink-300 inline-block px-2 border-2 border-black">Rincian Pembayaran</h2>
            <div className="flex justify-between"><span>Subtotal Produk</span><span>{formatRupiah(subtotalBarang)}</span></div>
            <div className="flex justify-between"><span>Ongkos Kirim ({order.courier_name})</span><span>{formatRupiah(order.shipping_cost)}</span></div>
            {nilaiDiskon > 0 && <div className="flex justify-between text-red-600 font-black"><span>Diskon Voucher ({order.voucher?.vouchers?.name})</span><span>- {formatRupiah(nilaiDiskon)}</span></div>}
            <div className="flex justify-between items-end pt-3 border-t-2 border-dashed border-black">
              <span className="font-black text-base uppercase">Total Akhir</span>
              <span className="font-black text-xl bg-yellow-200 border-2 border-black px-2 transform rotate-1">{formatRupiah(order.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* KANAN: ALAMAT & NOMOR RESI PENGIRIMAN */}
        <div className="space-y-6">
          <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-lg font-black uppercase mb-3 bg-blue-300 inline-block px-2 border-2 border-black">Alamat Tujuan</h2>
            <p className="font-black uppercase text-base">{order.customer_name}</p>
            <p className="text-xs font-bold text-gray-600 mt-0.5">{order.customer_phone}</p>
            <p className="text-xs font-bold opacity-80 mt-3 leading-relaxed border-t-2 border-black pt-2">📍 {order.customer_address}</p>
          </div>

          {order.biteship_tracking_id && (
            <div className="bg-blue-100 border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(59,130,246,1)] text-center space-y-4">
              <h2 className="text-lg font-black uppercase bg-white text-blue-600 inline-block px-2 border-2 border-black">Resi Terinput 🚚</h2>
              <div className="bg-white p-2 border-2 border-black font-mono font-black text-sm tracking-wider select-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] break-words">
                {order.biteship_tracking_id}
              </div>
              <button
                onClick={handleTrackPackage}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-black uppercase border-2 border-black px-4 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-sm"
              >
                📍 Lacak Pesanan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TRACKING MODAL */}
      {isTrackingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-opacity-70 backdrop-blur-sm">
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-lg max-h-[80vh] flex flex-col relative">

            {/* Modal Header */}
            <div className="p-4 border-b-4 border-black bg-yellow-300 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-xl font-black uppercase tracking-wider">Histori Pelacakan</h2>
              <button onClick={() => setIsTrackingModalOpen(false)} className="text-black font-black text-xl hover:scale-125 transition-transform bg-white border-2 border-black w-8 h-8 flex items-center justify-center rounded-full leading-none">×</button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto bg-[#f8f9fa] flex-1">
              {isTrackingLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="w-12 h-12 border-4 border-black border-t-blue-500 rounded-full animate-spin"></div>
                  <p className="font-black uppercase tracking-widest text-sm animate-pulse">Menghubungi Kurir...</p>
                </div>
              ) : trackingData ? (
                <div className="space-y-6">
                  {/* Courier Info Header */}
                  <div className="flex justify-between items-center bg-white p-3 border-2 border-black font-bold uppercase text-xs">
                    <span>Kurir: <span className="bg-black text-white px-2 py-0.5">{trackingData.courier || order.courier_name}</span></span>
                    <span>Resi: <span className="bg-gray-200 px-2 py-0.5 border border-black">{trackingData.tracking_id}</span></span>
                  </div>

                  {/* Timeline */}
                  <div className="relative border-l-4 border-black ml-4 space-y-8 pb-4">
                    {trackingData.history && trackingData.history.length > 0 ? trackingData.history.map((hist: any, index: number) => (
                      <div key={index} className="relative pl-6">
                        <div className="absolute w-4 h-4 bg-blue-500 border-2 border-black rounded-full -left-[10px] top-1"></div>
                        <div className="bg-white p-3 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                          <p className="text-xs font-black bg-gray-200 inline-block px-1 border border-black mb-1">
                            {new Date(hist.updated_at).toLocaleString("id-ID", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="font-bold text-sm mt-1">{hist.note}</p>
                          <p className="text-xs uppercase mt-2 opacity-60 font-bold">{hist.status}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center font-bold p-4 bg-white border-2 border-dashed border-black">Belum ada riwayat perjalanan.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center font-black uppercase py-8 text-red-500">
                  Gagal memuat data pelacakan.
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}