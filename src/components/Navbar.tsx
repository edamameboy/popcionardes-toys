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
  
  // State untuk Fitur Pencarian
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("Semua");

  const router = useRouter();
  const supabase = createClient();

  const items = useCartStore((state) => state.items);
  const totalCount = items.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    setMounted(true);
    const fetchUserAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: prof } = await supabase.from("profiles").select("username, avatar_url, points, role").eq("id", user.id).single();
        setProfile(prof);
      }
    };
    fetchUserAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const { data: prof } = await supabase.from("profiles").select("username, avatar_url, points, role").eq("id", session.user.id).single();
        setProfile(prof);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    // Mengambil query dari URL jika ada (agar input tidak kosong saat di-refresh)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("search")) setSearchQuery(urlParams.get("search") || "");
    if (urlParams.get("category")) setSearchCategory(urlParams.get("category") || "Semua");

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Realtime Points Updates
  useEffect(() => {
    if (!user) return; 
    const profileSubscription = supabase
      .channel('profile-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, (payload) => {
          setProfile((prev: any) => ({ ...prev, points: payload.new.points, username: payload.new.username, avatar_url: payload.new.avatar_url, role: payload.new.role }));
      }).subscribe();
    return () => { supabase.removeChannel(profileSubscription); };
  }, [user, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  };

  // --- FUNGSI EKSEKUSI PENCARIAN ---
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchCategory !== "Semua") params.append("category", searchCategory);
    if (searchQuery.trim() !== "") params.append("search", searchQuery.trim());
    
    // Melempar user ke halaman utama (Homepage) beserta filter URL-nya
    router.push(`/?${params.toString()}`);
  };

  if (!mounted) return null;

  return (
    <nav className="w-full bg-white border-b-4 border-black p-4 flex flex-col xl:flex-row items-center justify-between gap-4 sticky top-0 z-50">
      
      {/* === KIRI: LOGO === */}
      <Link href="/" className="block hover:skew-x-2 transition-transform select-none active:translate-x-0.5 active:translate-y-0.5 shrink-0">
        <img src="/logo.png" alt="Popcionardes Toys Logo" className="h-16 xl:h-20 w-auto object-contain" />
      </Link>

      {/* === TENGAH: MESIN PENCARIAN (SEARCH BAR) NEO BRUTALISM === */}
      <form onSubmit={handleSearchSubmit} className="flex w-full xl:max-w-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white h-12 transition-all focus-within:shadow-none focus-within:translate-x-1 focus-within:translate-y-1">
        
        {/* Dropdown Kategori */}
        <select 
          value={searchCategory}
          onChange={(e) => setSearchCategory(e.target.value)}
          className="bg-yellow-300 border-r-4 border-black px-2 sm:px-4 font-black uppercase text-xs sm:text-sm outline-none cursor-pointer w-28 sm:w-36 shrink-0"
        >
          <option value="Semua">Kategori</option>
          <option value="Anime">Anime</option>
          <option value="Marvel">Marvel</option>
          <option value="DC">DC Comics</option>
          <option value="WW">Wizardling World</option>
          <option value="Movies">Movies & TV</option>
          <option value="Gaming">Gaming</option>
          <option value="Disney">Disney</option>
          <option value="Music">Music / Rocks</option>
          <option value="Sports">Sports</option>
          <option value="Lainnya">Lainnya</option>
        </select>

        {/* Input Text */}
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari karakter POP! favoritmu..." 
          className="flex-1 px-4 font-bold outline-none text-sm w-full min-w-0"
        />

        {/* Tombol Submit */}
        <button type="submit" className="bg-blue-400 px-4 sm:px-6 font-black uppercase border-l-4 border-black hover:bg-black hover:text-white transition-colors shrink-0">
          Cari
        </button>
      </form>

      {/* === KANAN: MENU USER & KERANJANG === */}
      <div className="flex items-center gap-4 flex-wrap justify-center shrink-0">
        {user ? (
          <div className="flex items-center h-12 bg-yellow-200 border-4 border-black pl-2 pr-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold transition-all">
            <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 group h-full">
              {profile?.avatar_url && <img src={profile.avatar_url} alt="Profile Avatar" className="w-8 h-8 border-2 border-black bg-white object-cover group-hover:rotate-6 transition-transform" />}
              <div className="flex flex-col justify-center">
                <span className="uppercase text-sm tracking-tight hidden sm:block mr-2 leading-tight">{profile?.username || user.email?.split("@")[0]}</span>
                <span className="text-[10px] font-black bg-black text-yellow-300 px-1 border border-black inline-block w-max mt-0.5">🪙 {profile?.points || 0} PTS</span>
              </div>
            </Link>
            
            <div className="flex items-center gap-2 border-l-4 border-black pl-3 ml-1 h-full py-1">
              {profile?.role === 'admin' && (
                <a href="http://localhost:3001" target="_blank" rel="noopener noreferrer">
                  <button className="text-[10px] sm:text-xs font-black uppercase bg-yellow-400 border-2 border-black px-2 py-1 hover:bg-white hover:translate-x-0.5 hover:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all">Admin</button>
                </a>
              )}
              <Link href="/orders" className="block"><button className="text-[10px] sm:text-xs font-black uppercase bg-blue-300 border-2 border-black px-2 py-1 hover:bg-white hover:translate-x-0.5 hover:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all">Pesanan</button></Link>
              <button onClick={handleLogout} className="text-[10px] sm:text-xs font-black uppercase bg-red-400 border-2 border-black px-2 py-1 hover:bg-white hover:translate-x-0.5 hover:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all">Out</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 font-bold text-sm">
            <Link href="/login"><button className="px-4 py-2 uppercase bg-blue-300 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">Login</button></Link>
            <Link href="/register"><button className="px-4 py-2 uppercase bg-pink-300 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">Daftar</button></Link>
          </div>
        )}

        <Link href="/checkout" className="block">
          <button className="px-5 h-12 text-sm font-bold uppercase bg-green-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all active:bg-white flex items-center justify-center">
            Keranjang ({totalCount})
          </button>
        </Link>
      </div>
    </nav>
  );
}