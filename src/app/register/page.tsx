"use client";

import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(`Gagal Mendaftar: ${error.message}`);
    } else {
      alert("🔥 Registrasi Berhasil! Silakan Login.");
      router.push("/login");
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-pink-300 p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-6 bg-white inline-block px-2 border-2 border-black">
          Daftar Dulu
        </h1>
        
        <form onSubmit={handleRegister} className="space-y-6">
          <div className="space-y-2">
            <label className="font-bold uppercase text-sm">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border-4 border-black bg-white focus:bg-yellow-200 focus:outline-none focus:shadow-none focus:translate-x-1 focus:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all font-bold"
              placeholder="email@keren.com"
            />
          </div>

          <div className="space-y-2">
            <label className="font-bold uppercase text-sm">Password (Min. 6 Karakter)</label>
            <input 
              type="password" 
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border-4 border-black bg-white focus:bg-yellow-200 focus:outline-none focus:shadow-none focus:translate-x-1 focus:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all font-bold"
              placeholder="Rahasia123"
            />
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 text-xl font-black uppercase border-4 border-black transition-all ${
              isLoading 
              ? "bg-gray-400 opacity-70 translate-x-1.5 translate-y-1.5 shadow-none" 
              : "bg-green-400 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1.5 hover:translate-y-1.5"
            }`}
          >
            {isLoading ? "Memproses..." : "GAS DAFTAR"}
          </button>
        </form>

        <p className="mt-6 text-center font-bold">
          Sudah punya akun?{" "}
          <Link href="/login" className="underline hover:bg-black hover:text-white transition-all px-1">
            Login di sini bos.
          </Link>
        </p>
      </div>
    </div>
  );
}