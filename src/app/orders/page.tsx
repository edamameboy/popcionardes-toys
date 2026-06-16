"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

const formatRupiah = (angka: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
};

export default function OrdersPage() {
  const [mounted, setMounted] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    fetchUserOrders();
  }, []);

  const fetchUserOrders = async () => {
    try {
      // 1. Cek apakah user sudah login
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // 2. Tarik semua data order milik user ini, urutkan dari yang paling baru
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(ordersData || []);

    } catch (error: any) {
      alert(`Gagal mengambil riwayat pesanan: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted || isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center font-black text-2xl uppercase">
        Membuka Kotak Pesanan... 📦
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12 max-w-5xl mx-auto space-y-8">
      <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter border-b-4 border-black pb-4 inline-block">
        Daftar Belanjaanmu
      </h1>

      {orders.length === 0 ? (
        // Tampilan jika user belum pernah belanja sama sekali
        <div className="bg-white p-8 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center space-y-4">
          <p className="text-xl font-bold">Kamu belum pernah beli mainan di sini bos. Sad parah! 😢</p>
          <Link href="/">
            <button className="px-6 py-3 font-black uppercase bg-yellow-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
              Mulai Jajan Keluar
            </button>
          </Link>
        </div>
      ) : (
        // Tampilan List Pesanan Neo Brutalism
        <div className="space-y-6">
          {orders.map((order) => (
            <Link href={`/orders/${order.id}`} key={order.id} className="block group">
              <div 
                key={order.id} 
                className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Badge ID Order */}
                    <span className="text-xs font-black uppercase bg-gray-200 border-2 border-black px-2 py-0.5">
                      ID: #{order.id.substring(0, 8)}...
                    </span>
                    {/* Tanggal Belanja */}
                    <span className="text-xs font-bold opacity-70">
                      {new Date(order.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                    </span>
                  </div>
                  
                  {/* Informasi Kurir & Penerima */}
                  <p className="font-bold text-lg uppercase leading-tight">
                    Kirim ke: <span className="underline">{order.customer_name}</span> ({order.courier_name})
                  </p>
                  <p className="text-sm font-bold opacity-80 max-w-xl truncate">
                    📍 {order.customer_address}
                  </p>
                </div>

                {/* Status & Total Harga */}
                <div className="flex flex-row md:flex-col justify-between items-center md:items-end w-full md:w-auto border-t-2 md:border-t-0 border-black pt-4 md:pt-0 gap-4">
                  <div className="text-left md:text-right">
                    <p className="text-xs font-bold uppercase opacity-60">Total Bayar</p>
                    <p className="font-black text-xl bg-yellow-200 px-2 border-2 border-black inline-block">
                      {formatRupiah(order.total_amount)}
                    </p>
                  </div>

                  {/* BADGE STATUS DINAMIS PENUH WARNA */}
                  <span className={`text-sm font-black uppercase tracking-wider px-3 py-1.5 border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                    ${order.status === "paid" && "bg-green-400"}
                    ${order.status === "pending" && "bg-amber-300"}
                    ${order.status === "cancelled" && "bg-red-400"}
                  `}>
                    {order.status === "paid" ? "✅ SUKSES" : order.status === "pending" ? "⏳ BELUM BAYAR" : "❌ BATAL"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}