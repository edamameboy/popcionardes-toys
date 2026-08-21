"use client";

import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [method, setMethod] = useState<"email" | "whatsapp">("whatsapp");
  
  // Form State
  const [contactInfo, setContactInfo] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // STEP 1: Minta OTP
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (method === "email") {
        const { error } = await supabase.auth.resetPasswordForEmail(contactInfo);
        if (error) throw error;
      } else {
        // WhatsApp / Phone
        const formattedPhone = contactInfo.startsWith('0') ? '+62' + contactInfo.slice(1) : contactInfo;
        const { error } = await supabase.auth.signInWithOtp({
          phone: formattedPhone,
          options: { shouldCreateUser: false }
        });
        if (error) throw error;
      }
      
      setStep(2);
    } catch (error: any) {
      // Jika user tidak ditemukan (Signups not allowed for otp atau pesan sejenisnya)
      if (error.message.toLowerCase().includes("not allowed") || error.message.toLowerCase().includes("not found")) {
        alert("🚨 Akun belum terdaftar! Anda akan dialihkan ke halaman Pendaftaran.");
        router.push("/register");
      } else {
        alert(`Gagal mengirim kode: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Verifikasi OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (method === "email") {
        const { error } = await supabase.auth.verifyOtp({
          email: contactInfo,
          token: otpCode,
          type: "recovery",
        });
        if (error) throw error;
      } else {
        const formattedPhone = contactInfo.startsWith('0') ? '+62' + contactInfo.slice(1) : contactInfo;
        const { error } = await supabase.auth.verifyOtp({
          phone: formattedPhone,
          token: otpCode,
          type: "sms",
        });
        if (error) throw error;
      }
      
      // Jika berhasil, user otomatis login di background. Lanjut ke ubah password.
      setStep(3);
    } catch (error: any) {
      alert(`Kode salah atau kadaluarsa: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 3: Simpan Password Baru
  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return alert("Password dan Konfirmasi Password tidak cocok!");
    }
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      
      alert("🎉 Password berhasil diubah! Anda sudah login otomatis.");
      router.push("/");
    } catch (error: any) {
      alert(`Gagal mengubah password: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-green-300 p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-black uppercase tracking-tighter bg-white inline-block px-2 border-2 border-black">
            Lupa Password
          </h1>
          <div className="bg-black text-white font-black px-3 py-1 text-sm border-2 border-black transform rotate-3">
            STEP {step}/3
          </div>
        </div>

        {/* STEP 1: PILIH METODE & MASUKKAN KONTAK */}
        {step === 1 && (
          <form onSubmit={handleRequestOTP} className="space-y-6 animate-fade-in">
            <div className="space-y-2">
              <label className="font-bold uppercase text-sm">Metode Pemulihan</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setMethod("whatsapp")}
                  className={`py-2 border-4 border-black font-bold uppercase transition-all ${method === "whatsapp" ? "bg-black text-white shadow-none translate-x-1 translate-y-1" : "bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"}`}
                >
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("email")}
                  className={`py-2 border-4 border-black font-bold uppercase transition-all ${method === "email" ? "bg-black text-white shadow-none translate-x-1 translate-y-1" : "bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"}`}
                >
                  Email
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-bold uppercase text-sm">
                {method === "whatsapp" ? "Nomor WhatsApp Terdaftar" : "Alamat Email Terdaftar"}
              </label>
              <input 
                type={method === "whatsapp" ? "tel" : "email"}
                required
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                className="w-full p-3 border-4 border-black bg-white focus:bg-yellow-200 focus:outline-none focus:shadow-none focus:translate-x-1 focus:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all font-bold"
                placeholder={method === "whatsapp" ? "Contoh: 08123456789" : "email@keren.com"}
              />
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 text-xl font-black uppercase border-4 border-black transition-all ${
                isLoading 
                ? "bg-gray-400 opacity-70 translate-x-1.5 translate-y-1.5 shadow-none" 
                : "bg-yellow-400 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1.5 hover:translate-y-1.5"
              }`}
            >
              {isLoading ? "Mengirim..." : "Kirim Kode OTP"}
            </button>
          </form>
        )}

        {/* STEP 2: MASUKKAN KODE OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOTP} className="space-y-6 animate-fade-in">
            <p className="font-bold text-sm bg-white p-3 border-4 border-black mb-4">
              Kode 6 digit telah dikirim ke <span className="text-blue-600">{contactInfo}</span>
            </p>
            <div className="space-y-2">
              <label className="font-bold uppercase text-sm">Masukkan Kode OTP</label>
              <input 
                type="text" 
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="w-full p-3 border-4 border-black bg-white text-center text-2xl tracking-[0.5em] focus:bg-yellow-200 focus:outline-none focus:shadow-none focus:translate-x-1 focus:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all font-black"
                placeholder="------"
              />
            </div>

            <div className="flex gap-4">
              <button 
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-4 text-sm font-black uppercase border-4 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1.5 hover:translate-y-1.5 transition-all"
              >
                Kembali
              </button>
              <button 
                type="submit"
                disabled={isLoading}
                className={`w-2/3 py-4 text-xl font-black uppercase border-4 border-black transition-all ${
                  isLoading 
                  ? "bg-gray-400 opacity-70 translate-x-1.5 translate-y-1.5 shadow-none" 
                  : "bg-yellow-400 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1.5 hover:translate-y-1.5"
                }`}
              >
                {isLoading ? "Mengecek..." : "Verifikasi"}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: PASSWORD BARU */}
        {step === 3 && (
          <form onSubmit={handleSaveNewPassword} className="space-y-6 animate-fade-in">
            <p className="font-bold text-sm bg-white p-3 border-4 border-black mb-4 text-green-700">
              Verifikasi berhasil! Silakan buat password baru Anda.
            </p>
            
            <div className="space-y-2">
              <label className="font-bold uppercase text-sm">Password Baru</label>
              <input 
                type="password" 
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-3 border-4 border-black bg-white focus:bg-yellow-200 focus:outline-none focus:shadow-none focus:translate-x-1 focus:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all font-bold"
                placeholder="Minimal 6 karakter"
              />
            </div>

            <div className="space-y-2">
              <label className="font-bold uppercase text-sm">Konfirmasi Password Baru</label>
              <input 
                type="password" 
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 border-4 border-black bg-white focus:bg-yellow-200 focus:outline-none focus:shadow-none focus:translate-x-1 focus:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all font-bold"
                placeholder="Ketik ulang password"
              />
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 text-xl font-black uppercase border-4 border-black transition-all ${
                isLoading 
                ? "bg-gray-400 opacity-70 translate-x-1.5 translate-y-1.5 shadow-none" 
                : "bg-blue-400 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1.5 hover:translate-y-1.5"
              }`}
            >
              {isLoading ? "Menyimpan..." : "Simpan & Masuk"}
            </button>
          </form>
        )}

        {step === 1 && (
          <p className="mt-6 text-center font-bold">
            Sudah ingat?{" "}
            <Link href="/login" className="underline hover:bg-black hover:text-white transition-all px-1">
              Kembali ke Login.
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
