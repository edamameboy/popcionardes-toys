"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  // State untuk form
  const [formData, setFormData] = useState({
    username: "",
    full_name: "",
    phone: "",
    postal_code: "",
    address: "",
    avatar_url: "",
  });

  useEffect(() => {
    setMounted(true);
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Kalau belum login, usir ke halaman login
        router.push("/login");
        return;
      }
      setUser(user);

      // Ambil data profil dari database
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setFormData({
          username: profileData.username || "",
          full_name: profileData.full_name || "",
          phone: profileData.phone || "",
          postal_code: profileData.postal_code || "",
          address: profileData.address || "",
          avatar_url: profileData.avatar_url || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- FUNGSI UNTUK UPLOAD FOTO PROFIL ---
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploading(true);
      const file = e.target.files?.[0];
      if (!file || !user) return;

      // Buat nama file unik agar tidak bentrok atau kena cache browser lama
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload ke Supabase Storage (Bucket: avatars)
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Ambil URL Publik dari foto yang baru diupload
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // 3. Update state di frontend (gambar langsung berubah!)
      setFormData((prev) => ({ ...prev, avatar_url: publicUrl }));
      alert("✅ Foto berhasil diupload! Jangan lupa klik 'Simpan Perubahan'.");

    } catch (error: any) {
      alert(`Gagal upload foto: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // --- FUNGSI UNTUK SIMPAN DATA KE DATABASE ---
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: formData.username,
          full_name: formData.full_name,
          phone: formData.phone,
          postal_code: formData.postal_code,
          address: formData.address,
          avatar_url: formData.avatar_url,
        })
        .eq("id", user.id);

      if (error) throw error;
      
      alert("🔥 Profil Berhasil Disimpan! Navbar akan langsung menyesuaikan.");
      // Refresh halaman agar navbar mendeteksi username/foto baru
      window.location.reload(); 

    } catch (error: any) {
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted || isLoading) {
    return <div className="min-h-screen flex items-center justify-center font-black text-2xl uppercase">Loading Data Bos...</div>;
  }

  return (
    <div className="min-h-[80vh] py-12 px-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter border-b-4 border-black pb-4 inline-block">
        Markas Profil
      </h1>

      <div className="flex flex-col md:flex-row gap-12 items-start">
        
        {/* === KIRI: SEKSI FOTO PROFIL === */}
        <div className="w-full md:w-1/3 bg-blue-300 p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center space-y-6">
          <div className="relative group cursor-pointer">
            <img 
              src={formData.avatar_url || "https://api.dicebear.com/7.x/bottts/svg?seed=fallback"} 
              alt="Avatar" 
              className="w-40 h-40 object-cover rounded-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white group-hover:rotate-6 transition-all"
            />
            {/* Input file disembunyikan, ditempel di atas gambar */}
            <input 
              type="file" 
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={isUploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Klik untuk ganti foto"
            />
            <div className="absolute -bottom-2 -right-2 bg-yellow-400 border-2 border-black px-2 py-1 font-black text-xs uppercase transform rotate-12 pointer-events-none">
              {isUploading ? "Uploading..." : "GANTI"}
            </div>
          </div>
          
          <div>
            <p className="font-black text-xl uppercase">{formData.username || "User Misterius"}</p>
            <p className="font-bold text-sm bg-white border-2 border-black px-2 py-1 mt-2 inline-block">
              {user?.email}
            </p>
          </div>
        </div>

        {/* === KANAN: FORM DATA DIRI === */}
        <div className="w-full md:w-2/3 bg-pink-300 p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-2xl font-black uppercase mb-6 bg-white inline-block px-2 border-2 border-black">
            Lengkapi Data
          </h2>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-bold uppercase text-sm">Username</label>
                <input 
                  type="text" 
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full p-3 border-4 border-black bg-white focus:bg-yellow-200 focus:outline-none focus:shadow-none focus:translate-x-1 focus:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all font-bold"
                  placeholder="BocahKeren99"
                />
              </div>

              <div className="space-y-2">
                <label className="font-bold uppercase text-sm">Nama Lengkap</label>
                <input 
                  type="text" 
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="w-full p-3 border-4 border-black bg-white focus:bg-yellow-200 focus:outline-none focus:shadow-none focus:translate-x-1 focus:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all font-bold"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-bold uppercase text-sm">Nomor WhatsApp</label>
                <input 
                  type="tel" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full p-3 border-4 border-black bg-white focus:bg-yellow-200 focus:outline-none focus:shadow-none focus:translate-x-1 focus:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all font-bold"
                  placeholder="081234567890"
                />
              </div>

              <div className="space-y-2">
                <label className="font-bold uppercase text-sm text-red-700">Kode Pos (PENTING!)</label>
                <input 
                  type="text" 
                  maxLength={5}
                  required
                  value={formData.postal_code}
                  onChange={(e) => setFormData({...formData, postal_code: e.target.value.replace(/\D/g, '')})}
                  className="w-full p-3 border-4 border-black bg-yellow-200 focus:bg-white focus:outline-none focus:shadow-none focus:translate-x-1 focus:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all font-black text-xl tracking-widest placeholder:font-normal placeholder:text-sm placeholder:tracking-normal"
                  placeholder="11480"
                />
                <p className="text-xs font-bold leading-tight">Digunakan untuk hitung ongkir otomatis saat Checkout.</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-bold uppercase text-sm">Alamat Lengkap</label>
              <textarea 
                rows={3}
                required
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full p-3 border-4 border-black bg-white focus:bg-yellow-200 focus:outline-none focus:shadow-none focus:translate-x-1 focus:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all font-bold resize-none"
                placeholder="Jl. Neo Brutalism No. 99..."
              />
            </div>

            <button 
              type="submit"
              disabled={isSaving}
              className={`w-full py-4 mt-4 text-xl font-black uppercase border-4 border-black transition-all ${
                isSaving 
                ? "bg-gray-400 opacity-70 translate-x-1.5 translate-y-1.5 shadow-none" 
                : "bg-green-400 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1.5 hover:translate-y-1.5"
              }`}
            >
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}