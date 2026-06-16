"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

const formatRupiah = (angka: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
};

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("personal");

  const [formData, setFormData] = useState({ username: "", full_name: "", phone: "", postal_code: "", address: "", avatar_url: "" });
  const [userPoints, setUserPoints] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [availableVouchers, setAvailableVouchers] = useState<any[]>([]);
  const [myVouchers, setMyVouchers] = useState<any[]>([]);
  const [isRedeeming, setIsRedeeming] = useState(false);
  
  // State baru untuk Riwayat Poin
  const [pointHistory, setPointHistory] = useState<any[]>([]);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    fetchProfileAndData();
  }, []);

  const fetchProfileAndData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      setUser(user);

      // 1. Profil & Poin
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (profileData) {
        setFormData({
          username: profileData.username || "", full_name: profileData.full_name || "", phone: profileData.phone || "",
          postal_code: profileData.postal_code || "", address: profileData.address || "", avatar_url: profileData.avatar_url || "",
        });
        setUserPoints(profileData.points || 0);
      }

      // 2. Etalase & Dompet Voucher
      const { data: vouchersData } = await supabase.from("vouchers").select("*").order("points_required", { ascending: true });
      setAvailableVouchers(vouchersData || []);

      const { data: myVouchersData } = await supabase.from("user_vouchers").select("*, voucher:vouchers(*)").eq("user_id", user.id);
      setMyVouchers(myVouchersData || []);

      // 3. Tarik Data Pesanan Lunas (Untuk Poin Masuk)
      const { data: ordersData } = await supabase.from("orders").select("id, total_amount, created_at").eq("user_id", user.id).eq("status", "paid");

      // 4. JURUS RAHASIA: Gabungkan Data Pesanan dan Voucher menjadi History
      let historyRaw: any[] = [];
      
      // A. Masukkan daftar Poin Masuk
      if (ordersData) {
        ordersData.forEach(o => {
          historyRaw.push({
            id: o.id, type: 'earn',
            amount: Math.floor(o.total_amount / 1000),
            desc: `Cashback Pesanan #${o.id.substring(0, 8)}`,
            date: o.created_at
          });
        });
      }
      
      // B. Masukkan daftar Poin Keluar
      if (myVouchersData) {
        myVouchersData.forEach(v => {
          historyRaw.push({
            id: v.id, type: 'redeem',
            amount: v.voucher.points_required,
            desc: `Tukar Kupon: ${v.voucher.name}`,
            date: v.redeemed_at
          });
        });
      }

      // Urutkan dari yang terbaru (Tanggal Paling Muda)
      historyRaw.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPointHistory(historyRaw);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRedeemVoucher = async (voucher: any) => {
    if (userPoints < voucher.points_required) return alert("❌ Poin kamu belum cukup bos!");
    if (!confirm(`Tukar ${voucher.points_required} Poin dengan ${voucher.name}?`)) return;

    setIsRedeeming(true);
    try {
      const newPoints = userPoints - voucher.points_required;
      await supabase.from("profiles").update({ points: newPoints }).eq("id", user.id);
      await supabase.from("user_vouchers").insert({ user_id: user.id, voucher_id: voucher.id, is_used: false, redeemed_at: new Date().toISOString() });
      
      alert(`🎉 Sukses! Voucher ${voucher.name} masuk dompet.`);
      fetchProfileAndData(); // Refresh UI & History
    } catch (error: any) {
      alert(`Gagal menukar: ${error.message}`);
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await supabase.from("profiles").update({ ...formData }).eq("id", user.id);
      alert("🔥 Profil Berhasil Disimpan!");
      window.location.reload(); 
    } catch (error: any) { alert(`Gagal menyimpan: ${error.message}`); } finally { setIsSaving(false); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // ... [Kode Upload Sama Seperti Sebelumnya]
  };

  if (!mounted || isLoading) return <div className="min-h-screen flex justify-center items-center font-black text-2xl">Loading...</div>;

  return (
    <div className="min-h-[80vh] py-12 px-6 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-black pb-6 gap-4">
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">Markas Profil</h1>
        <div className="bg-yellow-400 border-4 border-black px-6 py-2 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transform rotate-2">
          <p className="font-bold text-sm uppercase">Koin Sultan</p>
          <p className="font-black text-3xl">🪙 {userPoints} PTS</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* === KIRI: MENU NAVIGASI (TABS) === */}
        <div className="w-full lg:w-1/4 flex flex-col gap-4">
          <button onClick={() => setActiveTab("personal")} className={`w-full py-4 px-6 text-xl font-black uppercase border-4 border-black transition-all text-left ${activeTab === "personal" ? "bg-black text-white shadow-none translate-x-1 translate-y-1" : "bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100"}`}>Data Diri</button>
          <button onClick={() => setActiveTab("vouchers")} className={`w-full py-4 px-6 text-xl font-black uppercase border-4 border-black transition-all text-left flex justify-between items-center ${activeTab === "vouchers" ? "bg-black text-white shadow-none translate-x-1 translate-y-1" : "bg-pink-300 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-pink-400"}`}>
            <span>Kuponku</span>
            {myVouchers.filter(v => !v.is_used).length > 0 && ( <span className="bg-white text-black px-2 py-0.5 text-sm border-2 border-black">{myVouchers.filter(v => !v.is_used).length}</span> )}
          </button>
          <button onClick={() => setActiveTab("history")} className={`w-full py-4 px-6 text-xl font-black uppercase border-4 border-black transition-all text-left ${activeTab === "history" ? "bg-black text-white shadow-none translate-x-1 translate-y-1" : "bg-blue-300 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-400"}`}>Riwayat Poin</button>
        </div>

        {/* === KANAN: KONTEN TABS === */}
        <div className="w-full lg:w-3/4">
          {/* TAB 1: DATA DIRI */}
          {activeTab === "personal" && (
            <div className="bg-white p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              {/* Form Data Diri */}
              <div className="flex flex-col md:flex-row gap-8 mb-8">
                <div className="relative group cursor-pointer w-max mx-auto md:mx-0">
                  <img src={formData.avatar_url || "https://api.dicebear.com/7.x/bottts/svg?seed=fallback"} alt="Avatar" className="w-32 h-32 object-cover border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:rotate-6 transition-all" />
                </div>
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="font-bold uppercase text-sm">Username</label><input type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="w-full p-3 border-4 border-black bg-gray-50 font-bold" /></div>
                    <div className="space-y-2"><label className="font-bold uppercase text-sm">Nama Lengkap</label><input type="text" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} className="w-full p-3 border-4 border-black bg-gray-50 font-bold" /></div>
                    <div className="space-y-2"><label className="font-bold uppercase text-sm text-red-600">Kode Pos</label><input type="text" maxLength={5} value={formData.postal_code} onChange={(e) => setFormData({...formData, postal_code: e.target.value})} className="w-full p-3 border-4 border-black bg-yellow-200 focus:bg-white font-black tracking-widest" /></div>
                  </div>
                  <div className="space-y-2"><label className="font-bold uppercase text-sm">Alamat Lengkap</label><textarea rows={3} value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full p-3 border-4 border-black bg-gray-50 font-bold resize-none" /></div>
                </div>
              </div>
              <button onClick={handleSaveProfile} disabled={isSaving} className="w-full py-4 text-xl font-black uppercase border-4 border-black bg-green-400 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">{isSaving ? "Menyimpan..." : "Simpan Profil"}</button>
            </div>
          )}

          {/* TAB 2: VOUCHERS */}
          {activeTab === "vouchers" && (
            <div className="space-y-8">
              {/* Dompet User */}
              <div className="bg-white p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <h2 className="text-2xl font-black uppercase mb-4 bg-yellow-300 inline-block px-2 border-2 border-black">Dompet Kuponku</h2>
                {myVouchers.length === 0 ? <p className="font-bold opacity-70">Dompet kupon masih kosong.</p> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myVouchers.map((userVoucher) => (
                      <div key={userVoucher.id} className={`p-4 border-4 border-black flex flex-col ${userVoucher.voucher.bg_color} ${userVoucher.is_used ? "opacity-50 grayscale" : "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"}`}>
                        <div className="flex justify-between items-start mb-2"><span className="font-black uppercase text-lg">{userVoucher.voucher.name}</span>{userVoucher.is_used && <span className="bg-black text-white text-xs font-black px-2 py-1">TERPAKAI</span>}</div>
                        <span className="text-2xl font-black bg-white px-2 py-1 border-2 border-black self-start mb-2 transform -rotate-1">- {formatRupiah(userVoucher.voucher.discount_amount)}</span>
                        {!userVoucher.is_used && <p className="text-xs font-bold mt-auto pt-2 border-t-2 border-black">Siap dipakai saat Checkout!</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Etalase */}
              <div className="bg-gray-100 p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <h2 className="text-2xl font-black uppercase mb-4 bg-pink-300 inline-block px-2 border-2 border-black">Etalase Penukaran</h2>
                <div className="grid grid-cols-1 gap-4">
                  {availableVouchers.map((voucher) => (
                    <div key={voucher.id} className="bg-white border-4 border-black p-4 flex flex-col sm:flex-row justify-between items-center gap-4 hover:-translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform">
                      <div><h3 className="font-black uppercase text-xl">{voucher.name}</h3><p className="font-bold text-sm opacity-80">{voucher.description}</p><p className="font-black text-green-600 mt-1">Diskon: {formatRupiah(voucher.discount_amount)}</p></div>
                      <button onClick={() => handleRedeemVoucher(voucher)} disabled={isRedeeming} className="w-full sm:w-auto px-6 py-3 font-black uppercase border-4 border-black bg-blue-300 hover:bg-blue-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">Tukar {voucher.points_required} Poin</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: POINT HISTORY (RIWAYAT AKTIF) */}
          {activeTab === "history" && (
            <div className="bg-white p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-3xl font-black uppercase mb-6 bg-blue-300 inline-block px-2 border-2 border-black">Buku Tabungan Koin</h2>
              
              {pointHistory.length === 0 ? (
                <p className="font-bold text-center p-6 bg-gray-100 border-4 border-black">Belum ada riwayat poin bos.</p>
              ) : (
                <div className="space-y-4">
                  {pointHistory.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-4 border-4 border-black bg-gray-50 hover:bg-yellow-100 transition-colors">
                      <div>
                        <p className="font-black uppercase">{item.desc}</p>
                        <p className="text-xs font-bold opacity-70">
                          {new Date(item.date).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className={`text-xl font-black px-3 py-1 border-2 border-black ${item.type === 'earn' ? 'bg-green-400' : 'bg-red-400 text-white'}`}>
                        {item.type === 'earn' ? '+' : '-'}{item.amount} PTS
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}