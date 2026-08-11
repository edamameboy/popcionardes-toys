import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavbarCart from "../components/Navbar";

// Menggunakan font sans-serif yang tebal untuk kesan brutalist
const inter = Inter({ subsets: ["latin"], weight: ["400", "700", "900"] });

export const metadata: Metadata = {
  title: "Popcionardes Toys | Funko POP! Store Indonesia",
  description: "Toko Funko POP! terlengkap dan termurah se-Indonesia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        {/* Promo Ticker Bar (Top) */}
        <div className="bg-black text-white border-b-2 border-black py-1 overflow-hidden flex whitespace-nowrap group">
          <div className="animate-marquee shrink-0 flex items-center font-bold uppercase text-xs tracking-widest group-hover:[animation-play-state:paused]">
            <span className="mx-4">🔥 FLASH SALE — Diskon 20% Semua Anime POP!</span>|
            <span className="mx-4">🚚 GRATIS ONGKIR Min. Belanja 500rb</span>|
            <span className="mx-4">🎁 Tukar Poin Jadi Voucher di Profil</span>|
            <span className="mx-4">🔥 FLASH SALE — Diskon 20% Semua Anime POP!</span>|
            <span className="mx-4">🚚 GRATIS ONGKIR Min. Belanja 500rb</span>|
          </div>
          <div className="animate-marquee shrink-0 flex items-center font-bold uppercase text-xs tracking-widest group-hover:[animation-play-state:paused]" aria-hidden="true">
            <span className="mx-4">🔥 FLASH SALE — Diskon 20% Semua Anime POP!</span>|
            <span className="mx-4">🚚 GRATIS ONGKIR Min. Belanja 500rb</span>|
            <span className="mx-4">🎁 Tukar Poin Jadi Voucher di Profil</span>|
            <span className="mx-4">🔥 FLASH SALE — Diskon 20% Semua Anime POP!</span>|
            <span className="mx-4">🚚 GRATIS ONGKIR Min. Belanja 500rb</span>|
          </div>
        </div>

        {/* Navbar */}
        <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white border-b-4 border-black">
          <NavbarCart />
        </nav>

        {/* Main Content Wrapper */}
        <main className="min-h-screen">
          {children}
        </main>

        {/* Footer Neo Brutalism */}
        <footer className="bg-black text-white border-t-8 border-black font-bold uppercase mt-20">
          <div className="max-w-6xl mx-auto p-8 md:p-12 grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4">
            
            {/* Kolom 1 - Brand */}
            <div className="space-y-4">
              <img src="/logo.png" alt="Popcionardes Logo" className="h-12 bg-white px-2 py-1 border-2 border-white rounded-sm" />
              <p className="text-sm opacity-80 normal-case leading-relaxed">
                Markas besar Funko POP! terlengkap di Indonesia. Temukan ribuan karakter favoritmu di sini.
              </p>
              <div className="flex gap-4 pt-2">
                <a href="#" className="w-10 h-10 bg-white text-black flex items-center justify-center border-2 border-white hover:bg-yellow-400 hover:-translate-y-1 transition-transform">IG</a>
                <a href="#" className="w-10 h-10 bg-white text-black flex items-center justify-center border-2 border-white hover:bg-yellow-400 hover:-translate-y-1 transition-transform">TK</a>
                <a href="#" className="w-10 h-10 bg-white text-black flex items-center justify-center border-2 border-white hover:bg-yellow-400 hover:-translate-y-1 transition-transform">X</a>
              </div>
            </div>

            {/* Kolom 2 - Navigasi */}
            <div className="space-y-4">
              <h3 className="text-xl font-black text-yellow-400">Navigasi</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="/" className="hover:text-yellow-400 hover:underline">Beranda</a></li>
                <li><a href="/?category=Semua" className="hover:text-yellow-400 hover:underline">Etalase Mainan</a></li>
                <li><a href="/orders" className="hover:text-yellow-400 hover:underline">Pesanan Saya</a></li>
                <li><a href="/profile" className="hover:text-yellow-400 hover:underline">Profil / Akun</a></li>
              </ul>
            </div>

            {/* Kolom 3 - Bantuan */}
            <div className="space-y-4">
              <h3 className="text-xl font-black text-pink-400">Bantuan</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-pink-400 hover:underline">FAQ</a></li>
                <li><a href="#" className="hover:text-pink-400 hover:underline">Kebijakan Privasi</a></li>
                <li><a href="#" className="hover:text-pink-400 hover:underline">Syarat & Ketentuan</a></li>
                <li><a href="#" className="hover:text-pink-400 hover:underline">Cara Belanja</a></li>
              </ul>
            </div>

            {/* Kolom 4 - Kontak */}
            <div className="space-y-4">
              <h3 className="text-xl font-black text-blue-400">Hubungi Kami</h3>
              <ul className="space-y-2 text-sm normal-case">
                <li className="flex gap-2 items-start">
                  <span>📍</span>
                  <span>Jakarta, Indonesia</span>
                </li>
                <li className="flex gap-2 items-center">
                  <span>📞</span>
                  <span>0812-3456-7890</span>
                </li>
                <li className="flex gap-2 items-center">
                  <span>✉️</span>
                  <span>halo@popcionardes.com</span>
                </li>
              </ul>
            </div>
            
          </div>
          
          {/* Bottom Bar */}
          <div className="border-t-4 border-gray-800 p-6 text-center space-y-4">
            <div className="flex justify-center gap-4 flex-wrap text-sm text-gray-400">
              <span>BCA</span> | <span>Mandiri</span> | <span>GoPay</span> | <span>OVO</span> | <span>ShopeePay</span>
            </div>
            <p className="tracking-widest text-xs text-gray-500">
              &copy; 2026 POPCIONARDES TOYS. ALL RIGHTS RESERVED.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}