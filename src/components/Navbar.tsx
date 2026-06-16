"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart";
import { createClient } from "@/utils/supabase/client";

export default function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  // Zustand: Ambil data keranjang secara reaktif
  const items = useCartStore((state) => state.items);
  const totalCount = items.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    setMounted(true);

    // 1. Ambil data user yang sedang aktif saat ini
    const fetchUserAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Ambil username, avatar, points, dan role
        const { data: prof } = await supabase
          .from("profiles")
          .select("username, avatar_url, points, role")
          .eq("id", user.id)
          .single();
        setProfile(prof);
      }
    };

    fetchUserAndProfile();

    // 2. Pantau (Listen) jika ada perubahan status login/logout secara real-time
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const { data: prof } = await supabase
          .from("profiles")
          .select("username, avatar_url, points, role")
          .eq("id", session.user.id)
          .single();
        setProfile(prof);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // === 3. MATA-MATA REALTIME SUPABASE (Update Poin & Role) ===
  useEffect(() => {
    if (!user) return; 

    const profileSubscription = supabase
      .channel('profile-updates')
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'profiles', 
          filter: `id=eq.${user.id}` 
        },
        (payload) => {
          // Update UI Navbar seketika saat ada perubahan di database
          setProfile((prev: any) => ({
            ...prev,
            points: payload.new.points,
            username: payload.new.username,
            avatar_url: payload.new.avatar_url,
            role: payload.new.role
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileSubscription);
    };
  }, [user, supabase]);

  // Fungsi untuk Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  };

  if (!mounted) return null; // Mencegah Next.js Hydration Error

  return (
    <nav className="w-full bg-white border-b-4 border-black p-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-50">
      
      {/* === KIRI: Logo Gambar (Kode yang Anda Minta) === */}
      <Link href="/" className="block hover:skew-x-2 transition-transform select-none active:translate-x-0.5 active:translate-y-0.5">
        <img 
          src="/logo.png" 
          alt="Popcionardes Toys Logo" 
          className="h-20 w-auto object-contain"
        />
      </Link>

      {/* === KANAN: Menu Autentikasi & Keranjang === */}
      <div className="flex items-center gap-4 flex-wrap justify-center">
        
        {user ? (
          // === KONDISI A: JIKA USER SUDAH LOGIN ===
          <div className="flex items-center h-12 bg-yellow-200 border-4 border-black pl-2 pr-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold transition-all">
            
            {/* Bagian Profil & Poin */}
            <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 group h-full">
              {profile?.avatar_url && (
                <img 
                  src={profile.avatar_url} 
                  alt="Profile Avatar" 
                  className="w-8 h-8 border-2 border-black bg-white object-cover group-hover:rotate-6 transition-transform"
                />
              )}
              <div className="flex flex-col justify-center">
                <span className="uppercase text-sm tracking-tight hidden sm:block mr-2 leading-tight">
                  {profile?.username || user.email?.split("@")[0]}
                </span>
                {/* Lencana Poin Sultan */}
                <span className="text-[10px] font-black bg-black text-yellow-300 px-1 border border-black inline-block w-max mt-0.5">
                  🪙 {profile?.points || 0} PTS
                </span>
              </div>
            </Link>
            
            {/* Garis Pembatas Vertikal & Tombol Aksi */}
            <div className="flex items-center gap-2 border-l-4 border-black pl-3 ml-1 h-full py-1">
              
              {/* TOMBOL RAHASIA ADMIN (Hanya muncul jika role = 'admin') */}
              {profile?.role === 'admin' && (
                <Link href="/admin" className="block">
                  <button className="text-xs font-black uppercase bg-purple-400 text-black border-2 border-black px-2 py-1 hover:bg-black hover:translate-x-0.5 hover:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all">
                    Admin
                  </button>
                </Link>
              )}

              <Link href="/orders" className="block">
                <button className="text-xs font-black uppercase bg-blue-300 border-2 border-black px-2 py-1 hover:bg-white hover:translate-x-0.5 hover:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all">
                  Pesanan
                </button>
              </Link>

              <button 
                onClick={handleLogout}
                className="text-xs font-black uppercase bg-red-400 text-white border-2 border-black px-2 py-1 hover:bg-black transition-all active:translate-x-0.5 active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"
              >
                Out
              </button>
            </div>

          </div>
        ) : (
          // === KONDISI B: JIKA USER BELUM LOGIN ===
          <div className="flex items-center gap-3 font-bold text-sm">
            <Link href="/login">
              <button className="px-4 py-2 uppercase bg-blue-300 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
                Login
              </button>
            </Link>
            <Link href="/register">
              <button className="px-4 py-2 uppercase bg-pink-300 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
                Daftar
              </button>
            </Link>
          </div>
        )}

        {/* === TOMBOL KERANJANG UTAMA === */}
        <Link href="/checkout" className="block">
          <button className="px-5 py-2 text-sm font-bold uppercase bg-green-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all active:bg-white">
            Keranjang ({totalCount})
          </button>
        </Link>
      </div>
    </nav>
  );
}